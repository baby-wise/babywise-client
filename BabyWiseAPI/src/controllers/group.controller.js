import { Group_DB, Group } from "../domain/group.js"
import { getUserById } from "./user.controller.js"

const groups = async (req,res)=>{
    try {
        const users = await Group_DB.find().populate("users")
        res.json(users)
    } catch (error) {
        console.log(error)
    }
}

const newGroup = async (req,res)=>{
    const {UID, name} = req.body
    const user = await getUserById(UID)
    if(user){
        const group = new Group({name})
        group.addMember(user)
        group.addAdmin(user)
    
        const groupDB = new Group_DB(group)
        await groupDB.save()
    
        res.json(group)
    }else{
        res.status(404).json({error: "User not Found"})
    }
}

const addMember  = async (req,res)=>{
    const {UID, groupId} = req.body
    const groupDB = await getGroupById(groupId)
    const userDB = await getUserById(UID)

    if(groupDB && userDB){//Verifico que exista el grupo y el usuario
        const group = new Group(groupDB)

        if(!group.users.some(u => u._id.toString() == userDB._id.toString())){//Verifico que el usuario no esta ya en ese grupo
            group.addMember(userDB)
            await Group_DB.updateOne(
                {_id: groupDB._id},
                {$set: {users: group.users}}
            )
            res.status(200).json(group)
        }else{
            res.status(304).json(group)
        }
    }else{
        res.status(404).json({error: "Group or user not found"})
    }
}

const removeMember  = async (req,res)=>{
    const {UID, groupId} = req.body
    const groupDB = await getGroupById(groupId)
    const userDB = await getUserById(UID)

    if(groupDB && userDB){//Verifico que exista el grupo y el usuario
        const group = new Group(groupDB)

        if(group.users.some(u => u._id.toString() == userDB._id.toString())){//Verifico que el usuario esta en ese grupo
            group.removeMember(userDB)
            await Group_DB.updateOne(
                {_id: groupDB._id},
                {$set: {users: group.users}}
            )
            res.status(200).json(group)
        }else{
            res.status(304).json(group)
        }
    }else{
        res.status(404).json({error: "Group or user not found"})
    }

}

const isAdmin  = async (req,res)=>{

}

const addAdmin  = async (req,res)=>{

}

const getGroupsForUser  = async (req,res)=>{

}

async function getGroupById(groupId) {
    const group = await Group_DB.findById(groupId)
    return group
}

export {groups, newGroup, addMember, removeMember, isAdmin, addAdmin, getGroupsForUser}