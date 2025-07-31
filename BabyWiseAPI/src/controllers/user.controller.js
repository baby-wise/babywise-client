import { User_DB } from "../domain/user.js"

const users = async (req,res)=>{
    try {
        const users = await User_DB.find()
        res.json(users)
    } catch (error) {
        console.log(error)
    }
}

const newUser = async (req,res)=>{

}

async function findUserByUID (UID){
    console.log(UID)
    const user = await User_DB.findOne({UID})
    return user
}

export {users, newUser, findUserByUID}