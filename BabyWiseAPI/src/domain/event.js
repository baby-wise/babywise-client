import mongoose from "mongoose";
import { Group_DB } from "./group.js";

class Event{
    constructor({group, baby, type, date}){
        this.group = group,
        this.baby = baby
        this.type = type,
        this.date = date || new Date()
    }
}

const eventSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  baby: {type: String, required: true},
  type: {type: String, enum: ["LLANTO", "MOVIMIENTO", "BATERIA BAJA", "PERDIDA DE CONEXION"]},
  date: {type: Date}
});

const Event_DB = mongoose.model("event", eventSchema);
export {Event,Event_DB}
