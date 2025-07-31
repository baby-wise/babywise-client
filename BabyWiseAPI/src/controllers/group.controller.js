import { Group_DB, Group } from "../domain/group.js"
import { findUserByUID } from "./user.controller.js"

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
    const user = await findUserByUID(UID)
    const group = new Group({name})
    group.addMember(user)

    const groupDB = new Group_DB(group)
    await groupDB.save()

    res.json(group)
}

const addMember  = async (req,res)=>{

}

const removeMember  = async (req,res)=>{

}

const isAdmin  = async (req,res)=>{

}

const addAdmin  = async (req,res)=>{

}

const getGroupsForUser  = async (req,res)=>{

}

export {groups, newGroup, addMember, removeMember, isAdmin, addAdmin, getGroupsForUser}