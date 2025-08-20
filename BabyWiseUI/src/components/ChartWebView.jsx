import React, { useMemo } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

// ChartWebView: recibe `labels` y `datasets` (array of {label, data, backgroundColor, borderColor})
const ChartWebView = ({ labels = [], datasets = [], height = 220 }) => {
  const html = useMemo(() => {
    // Simple HTML que carga Chart.js y chartjs-plugin-zoom desde CDN
    // Habilita panning horizontal y muestra scrollbar cuando el canvas excede el ancho
    const labelsJson = JSON.stringify(labels);
    const datasetsJson = JSON.stringify(datasets);

    return `
      <!doctype html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <style>
          html, body, #root { margin: 0; padding: 0; }
          .scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; height: ${height}px; }
          canvas { display: block; }
        </style>
      </head>
      <body>
        <div id="root">
          <div class="scroll">
            <canvas id="chart" height="${height}"></canvas>
          </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@1.2.1/dist/chartjs-plugin-zoom.min.js"></script>
        <script>
          const labels = ${labelsJson};
          const datasets = ${datasetsJson};

          function createChart() {
            const canvas = document.getElementById('chart');
            const ctx = canvas.getContext('2d');

            // width per point; using 90 like before for better spacing (tweak if needed)
            const pointWidth = 90;
            const totalWidth = Math.max(pointWidth * labels.length, window.innerWidth);
            const ratio = window.devicePixelRatio || 1;
            // Set canvas drawing buffer to device pixels and CSS to logical pixels to avoid scaling
            canvas.width = Math.round(totalWidth * ratio);
            canvas.style.width = totalWidth + 'px';
            canvas.height = Math.round(${height} * ratio);
            canvas.style.height = '${height}px';

            // ensure Chart uses the correct device pixel ratio
            ctx.canvas.style.imageRendering = 'auto';
            new Chart(ctx, {
              type: 'line',
              data: { labels, datasets },
              options: {
                responsive: false,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                elements: { point: { radius: 4 }, line: { tension: 0.3, borderWidth: 2 } },
                plugins: { zoom: { pan: { enabled: true, mode: 'x' }, zoom: { enabled: false } } },
                scales: { x: { display: true, grid: { display: false } }, y: { beginAtZero: true } }
              }
            });
          }

          window.addEventListener('load', function() { createChart(); var sc = document.querySelector('.scroll'); if (sc) sc.scrollLeft = 0; });
          window.addEventListener('resize', createChart);
        </script>
      </body>
      </html>
    `;
  }, [labels, datasets, height]);

  return (
    <View style={{ height }}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        automaticallyAdjustContentInsets={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => <ActivityIndicator style={{ flex: 1 }} />}
        mixedContentMode="always"
      />
    </View>
  );
};

export default ChartWebView;
