import { AccessToken, WebhookReceiver, EgressClient, TrackType } from 'livekit-server-sdk';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

// Livekit vars
const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const livekitHost = process.env.LIVEKIT_URL;
const livekitEgressUrl = 'https://' + livekitHost;
const receiver = new WebhookReceiver(apiKey, apiSecret);
const egressClient = new EgressClient(livekitEgressUrl, apiKey, apiSecret);
const wsAudioPath = '/audio-egress';

// Cloudflare R2 client
const s3Client = new S3Client({
  region: process.env.CF_REGION || 'auto',
  endpoint: process.env.CF_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CF_KEY_ID,
    secretAccessKey: process.env.CF_KEY_SECRET,
  },
  forcePathStyle: true,
});

function dispatchAudioTrackEgress(event) {
    console.log('[Webhook] Evento track_published de cámara detectado');
    const roomName = event.room.name;
    const track = event.track;
    if (track && track.type === TrackType.AUDIO) {
    const wsUrl = `wss://${process.env.SERVER_ANNOUNCED_URL}${wsAudioPath}?trackID=${encodeURIComponent(track.sid)}&participant=${encodeURIComponent(event.participant.identity)}`;
    egressClient.startTrackEgress(roomName, wsUrl, track.sid)
        .then(info => {
        console.log('[Egress] TrackEgress lanzado:', info.egressId, 'URL:', wsUrl);
        })
        .catch(err => {
        console.error('[Egress] Error lanzando TrackEgress:', err);
        });
    }
}

function dispatchHLSParticipantEgress(event) {
    console.log('[Webhook] Evento participant_joined de cámara detectado');
    const roomName = event.room.name;
    const participantIdentity = event.participant.identity;
    const { 
        CF_KEY_ID, 
        CF_KEY_SECRET, 
        CF_BUCKET_NAME,
        CF_ENDPOINT 
    } = process.env;

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const today = `${yyyy}-${mm}-${dd}`;
    const time = `${hh}_${min}_${ss}`;
    const pathPrefix = `recordings/${roomName}/${participantIdentity}/${today}/${time}`;

    const outputs = {
        segments: {
            filenamePrefix: `${pathPrefix}/hls`,
            playlistName: `${pathPrefix}/playlist.m3u8`,
            livePlaylistName: `${pathPrefix}/playlist-live.m3u8`,
            segmentDuration: 6,
            output: {
            case: 's3',
            value: {
                accessKey: CF_KEY_ID || '',
                secret: CF_KEY_SECRET || '',
                bucket: CF_BUCKET_NAME || '',
                endpoint: CF_ENDPOINT || '',
                forcePathStyle: true,
            },
            },
        },
    }
    
    egressClient
        .startParticipantEgress(roomName, participantIdentity, outputs)
        .then(info => {console.log('[Egress] ParticipantEgress HLS lanzado:', info.egressId);})
        .catch(err => {console.error('[Egress] Error lanzando ParticipantEgress HLS:', err);});    
}

const handleMediaServerEvent = async (req, res) => {
  try {
    const event = await receiver.receive(req.body, req.get('Authorization'));
    console.log('[Webhook] Evento recibido:', event.event);

    // Iniciar TrackEgress para audio de camaras
    if (event.event === 'track_published' && event.participant && event.participant.identity && event.participant.identity.startsWith('camera-')) {
        dispatchAudioTrackEgress(event);
    }
    
    // Lanzar ParticipantEgress HLS a S3 (Backblaze) para cámaras al unirse
    if (event.event === 'participant_joined' && event.participant && event.participant.identity && event.participant.identity.startsWith('camera-')) {
        dispatchHLSParticipantEgress(event);
    }

    if(event.event === 'room_started'){
      const roomName = event.room.name;
      const dataToSend = {roomName: roomName}
      await fetch(`http://${process.env.AGENT_URL}`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify(dataToSend)
      })
    }

    res.status(200).send('ok');

  } catch (err) {
    console.error('[Webhook] Error procesando webhook:', err);
    res.status(400).send('invalid webhook');
  }
}

const handleTokenGrant = async (req, res) => {
  const { roomName, participantName } = req.query;
  if (!roomName || !participantName) {
    return res.status(400).send('Missing roomName or participantName query parameters');
  }

  if (!apiKey || !apiSecret || !livekitHost) {
    return res.status(501).send('LiveKit server environment variables not configured.');
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
  });

  const videoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  };
  at.addGrant(videoGrant);

  at.toJwt().then(token => {
    res.json({ token });
  }).catch(err => {
    console.error('Error generating token:', err);
    res.status(502).send('Error generating token');
  });
}

const handleGetRecordings = async (req, res) => {
  const { room } = req.query;
  if (!room) {
    return res.status(400).json({ error: 'room is required' });
  }
  const bucket = process.env.CF_BUCKET_NAME;
  const prefix = `recordings/${room}/`;
  try {
    // recordingsByParticipant: { [participantIdentity]: { [fecha_hora]: {date, time, playlistUrl, key, duration} } }
    let recordingsByParticipant = {};
    let continuationToken = undefined;
    do {
      const params = {
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      };
      const resp = await s3Client.send(new ListObjectsV2Command(params));
      for (const obj of resp.Contents || []) {
        // Esperado: obj.Key = recordings/{room}/{participant}/{fecha}/{hora}/hls000.ts o playlist.m3u8
        const keyParts = obj.Key.split('/');
        const participantIdentity = keyParts[2];
        const date = keyParts[3];
        const time = keyParts[4];

        if (!participantIdentity || !date || !time) continue;
        if (!recordingsByParticipant[participantIdentity]) {
          recordingsByParticipant[participantIdentity] = {};
        }
        const recId = `${date}_${time}`;
        if (!recordingsByParticipant[participantIdentity][recId]) {
          recordingsByParticipant[participantIdentity][recId] = {
            date,
            time,
            playlistUrl: null,
            key: null,
            duration: 0,
          };
        }
        if (obj.Key.endsWith('.m3u8') && !obj.Key.endsWith('-live.m3u8')) {
          recordingsByParticipant[participantIdentity][recId].playlistUrl = `${process.env.CF_PUBLIC_URL}/${obj.Key}`;
          recordingsByParticipant[participantIdentity][recId].key = obj.Key;
        }
        if (obj.Key.endsWith('.ts')) {
          recordingsByParticipant[participantIdentity][recId].duration += 6;
        }
      }
      continuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
    } while (continuationToken);
    // Convertir a formato de respuesta: array de { participant, recordings: [ ... ] }
    let result = [];
    for (const [participant, recMap] of Object.entries(recordingsByParticipant)) {
      console.log(`[DEBUG] Procesando grabaciones de ${participant}: ${JSON.stringify(recMap)}`);
      const recordings = Object.values(recMap).filter(r => r.playlistUrl);
      if (recordings.length > 0) {
        result.push({ participant, recordings });
      }
    }
    console.log(`[API] Grabaciones encontradas en el room ${room}: `, result);
    res.json({ recordingsByParticipant: result });
  } catch (err) {
    console.error('[API] Error listando grabaciones:', err);
    res.status(500).json({ error: 'Error listing recordings' });
  }
}
export { handleMediaServerEvent, handleTokenGrant, handleGetRecordings };