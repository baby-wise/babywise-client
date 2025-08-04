import mongoose from "mongoose";
import { User_DB } from "./user.js";

class Group {
    constructor({_id, name, users, cameras, viewers, admins }) {
        this._id = _id.toString()
        this.name = name;
        this.users = users || [];
        this.cameras = cameras || [];
        this.viewers = viewers || [];
        this.admins = admins || [];
    }

    addMember(newMember) {
        this.users.push(newMember);
    }

    removeMember(memberToRemove) {
        const memberLists = ['users', 'cameras', 'viewers', 'admins'];

        for (const listName of memberLists) {
            this[listName] = this[listName].filter(
                (member) => member._id.toString() !== memberToRemove._id.toString()
            );
        }
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
}

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },

  users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  cameras: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  //preferencias: { type: mongoose.Schema.Types.ObjectId, ref: "Preferencias" }
});

const Group_DB = mongoose.model("Group", groupSchema);
export { Group_DB, Group };