import express from "express";
import Project from "../models/Project.mjs";

const router = express.Router();

/**
 * Create a project
 */
router.post("/", async (req, res) => {
  try {
    const { name, finalItem } = req.body;

    const project = await Project.create({
      name,
      finalItem,
      members: []
    });

    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Get a project by id
 */
router.get("/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
