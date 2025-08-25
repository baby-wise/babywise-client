import { Event_DB } from "../domain/event.js"
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
            const event = new Event({group, baby, type})
            res.status(200).json(event)
        }
    }else{
        res.status(404).json({error: "Group or user not found"})
    }

}

export{events}