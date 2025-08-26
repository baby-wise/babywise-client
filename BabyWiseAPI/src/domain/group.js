import mongoose from "mongoose";
import { User_DB } from "./user.js";

class Group {
    constructor({_id, name, users, cameras, viewers, admins,babies }) {
        this._id = _id
        this.name = name;
        this.users = users || [];
        this.cameras = cameras || [];
        this.viewers = viewers || [];
        this.admins = admins || [];
        this.babies = babies || []
    }

    addMember(newMember) {
        this.users.push(newMember);
    }

    removeMember(memberToRemove) {
        const memberLists = ['users', 'viewers', 'admins'];

        for (const listName of memberLists) {
            this[listName] = this[listName].filter(
                (member) => member._id.toString() !== memberToRemove._id.toString()
            );
        }

        this.cameras = this.cameras.filter(c => c.user._id.toString() !==  memberToRemove._id.toString())
    }

    isAdmin(member) {
        return this.admins.some(
            (admin) => admin._id.toString() === member._id.toString()
        );
    }

    addAdmin(member) {
        if (!this.isAdmin(member)) {
            this.admins.push(member);
        }
    }

    addCamera(member, camaraName) {
        const existingCamera = this.cameras.find(
            c => c.user._id.toString() === member._id.toString()
        );
        
        if (existingCamera) {
            existingCamera.name = camaraName;
        } else { //Si no existe la nombre de camara para ese miembro le agrego uno
            this.cameras.push({
                name: camaraName,
                user: member
            });
        }

    }
    addBabyName(name){
        if(!this.existingBabyName(name)){
            this.babies.push(name)
        }
    }
    existingBabyName(name){
        const normName = normalizeName(name)
        return this.babies.some(b=> normalizeName(b) === normName) 
    }

    getBabyNameForMember(member) {
        const camera = this.cameras.find(c => c.user._id.toString() === member._id.toString())
        const babyNameFromCamera = camera.name;
        const normalizedCameraName = normalizeName(babyNameFromCamera);

        // Buscar en la lista de bebés el que coincida normalizado
        const babyName = this.babies.find(baby => normalizeName(baby) === normalizedCameraName);

        return babyName
    }

    addViewer(member){
        if(!this.viewers.some(v => v._id.toString()=== member._id.toString())){
            this.viewers.push(member)
        }
    }
}

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },

  users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  cameras: [{
    name: { type: String},
    user:{ type: mongoose.Schema.Types.ObjectId, ref: "User" }}],
  viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  babies: [{ type: String}]
  
  //preferencias: { type: mongoose.Schema.Types.ObjectId, ref: "Preferencias" }
});

function normalizeName(name) {
  return name
    .normalize("NFD")                // separa letras de tildes
    .replace(/[\u0300-\u036f]/g, "") // elimina tildes
    .replace(/\s+/g, "")             // elimina espacios
    .toLowerCase();
}


const Group_DB = mongoose.model("Group", groupSchema);
export { Group_DB, Group };