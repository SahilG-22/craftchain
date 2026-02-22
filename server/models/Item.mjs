import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true
    },

    name: {
      type: String,
      required: true
    },

    requiredQty: {
      type: Number,
      required: true
    },

    completedQty: {
      type: Number,
      default: 0
    },

    dependencies: [
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item"
        },
        qty: {
          type: Number,
          required: true
        }
      }
    ],
    contributions: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      qty: Number,
      createdAt: { type: Date, default: Date.now }
    },
  ],
  },
  { timestamps: true }
);

export default mongoose.model("Item", itemSchema);
