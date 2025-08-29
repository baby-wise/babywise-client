import { Event_DB, Event } from "../domain/event.js"
import { Group } from "../domain/group.js"
import { getUserById } from "./user.controller.js"
import { getGroupById } from "./group.controller.js"

const events = async (req,res)=>{
    try {
        const events = await Event_DB.find()
        res.json(events)
    } catch (error) {
        console.log(error)
    }
}

const newEvent = async (req,res)=>{
    const {UID, groupId, type} = req.body

    const groupDB = await getGroupById(groupId)
    const userDB = await getUserById(UID)

    if(groupDB && userDB){//Verifico que exista el grupo y el usuario
        const group = new Group(groupDB)
        if(group.users.some(u => u._id.toString() == userDB._id.toString())){ //Verifico que el usuario este en el grupo
            const baby = group.getBabyNameForMember(userDB)
            const eventDB = new Event_DB({group, baby, type})
            try {
                await eventDB.save()
                res.status(200).json(eventDB)
            } catch (error) {
                if (error.name === "ValidationError" && error.errors.type.kind === "enum") {
                    return res.status(400).json({ error: "Tipo de evento inválido", type: type });
                }
                res.status(500).json(error)
            }
        }
    }else{
        res.status(404).json({error: "Group or user not found"})
    }

}

const getEventsByGroup = async (req, res) => {
  const { groupId } = req.params;
  try {
    const events = await Event_DB.find(
      {group: groupId}
    )
    if(events){
      res.status(200).json(events)
    }else{
      res.status(400).json({message: "No hay eventos para el grupo"})
    }

  } catch (error) {
    res.status(500).json(error);
  }
};

export{events, newEvent, getEventsByGroup}