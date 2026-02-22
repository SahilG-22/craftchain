import express from "express";
import Item from "../models/Item.mjs";
import { authMiddleware } from "../middleware/authMiddleware.mjs";
import Contribution from "../models/Contribution.mjs";

const router = express.Router();

/**
 * Create item inside a project
 */
const hasCircularDependency = async (startItemId, targetName, visited = new Set()) => {
  if (visited.has(startItemId.toString())) {
    return false;
  }

  visited.add(startItemId.toString());

  const item = await Item.findById(startItemId).populate("dependencies");

  if (!item) return false;

  // If dependency name matches new item name → cycle
  if (item.name === targetName) {
    return true;
  }

  for (let dep of item.dependencies) {
    const foundCycle = await hasCircularDependency(
      dep._id,
      targetName,
      visited
    );

    if (foundCycle) return true;
  }

  return false;
};

router.post("/", async (req, res) => {
  try {
    const { project, name, requiredQty, dependencies } = req.body;

    if (!project || !name || requiredQty === undefined) {
      return res.status(400).json({
        message: "project, name and requiredQty are required",
      });
    }

    // 🔥 Circular dependency check
    if (dependencies && dependencies.length > 0) {
      for (let depId of dependencies) {
        const isCircular = await hasCircularDependency(depId, name);

        if (isCircular) {
          return res.status(400).json({
            message: "Circular dependency detected!",
          });
        }
      }
    }

    const item = await Item.create({
      project,
      name,
      requiredQty: Number(requiredQty),
      dependencies: dependencies || [],
      contributions: [],
    });

    res.status(201).json(item);
  } catch (err) {
    console.error("Create Item Error:", err);
    res.status(500).json({ message: err.message });
  }
});


/**
 * Add dependency by name
 */
router.post("/add-dependency-by-name", async (req, res) => {
  try {
    const { projectId, parentName, dependencyName, qty } = req.body;

    if (!projectId || !parentName || !dependencyName || !qty) {
      return res.status(400).json({
        message: "projectId, parentName, dependencyName and qty are required",
      });
    }

    const parentItem = await Item.findOne({
      name: parentName,
      project: projectId,
    });

    if (!parentItem) {
      return res.status(404).json({
        message: "Parent item not found in project",
      });
    }

    const dependencyItem = await Item.findOne({
      name: dependencyName,
      project: projectId,
    });

    if (!dependencyItem) {
      return res.status(404).json({
        message: "Dependency item not found in project",
      });
    }

    if (parentItem._id.equals(dependencyItem._id)) {
      return res.status(400).json({
        message: "Item cannot depend on itself",
      });
    }

    const alreadyExists = parentItem.dependencies.some((dep) =>
      dep.item.equals(dependencyItem._id),
    );

    if (alreadyExists) {
      return res.status(400).json({
        message: "Dependency already exists",
      });
    }

    parentItem.dependencies.push({
      item: dependencyItem._id,
      qty,
    });

    await parentItem.save();

    res.json({
      message: "Dependency added successfully",
      item: parentItem,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/bulk", async (req, res) => {
  try {
    const items = await Item.insertMany(req.body);
    res.json(items);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * Get full dependency tree recursively
 */
router.get("/:id/full-tree", async (req, res) => {
  try {
    async function buildTree(itemId, visited = new Set()) {
      if (visited.has(itemId.toString())) {
        return { message: "Circular dependency detected" };
      }

      visited.add(itemId.toString());

      const item = await Item.findById(itemId).populate("dependencies.item");

      if (!item) return null;

      const result = {
        _id: item._id,
        name: item.name,
        requiredQty: item.requiredQty,
        dependencies: [],
      };

      for (const dep of item.dependencies) {
        const childTree = await buildTree(dep.item._id, visited);

        result.dependencies.push({
          qty: dep.qty,
          ...childTree,
        });
      }

      return result;
    }

    const tree = await buildTree(req.params.id);

    if (!tree) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json(tree);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Get all items for a project
 */
router.get("/project/:projectId", async (req, res) => {
  try {
    const items = await Item.find({
      project: req.params.projectId,
    }).populate("contributions.user", "username");

    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


/**
 * Update item progress (craft item)
 */
router.patch("/:id/progress", authMiddleware, async (req, res) => {
  try {
    const { incrementBy } = req.body;

    if (!incrementBy || incrementBy <= 0) {
      return res.status(400).json({
        message: "incrementBy must be a positive number",
      });
    }

    const item = await Item.findById(req.params.id).populate(
      "dependencies.item",
    );

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // 🔥 Dependency validation
    for (const dep of item.dependencies) {
      if (dep.item.completedQty < dep.qty) {
        return res.status(400).json({
          message: `Cannot craft. Dependency "${dep.item.name}" incomplete`,
        });
      }
    }

    item.completedQty += incrementBy;

    if (item.completedQty > item.requiredQty) {
      item.completedQty = item.requiredQty;
    }

    await Contribution.create({
      user: req.user._id,
      project: item.project,
      item: item._id,
      quantity: incrementBy,
      type: "crafted",
    });

    await item.save();

    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/:id/contribute", authMiddleware, async (req, res) => {
  const { qty } = req.body;

  const item = await Item.findById(req.params.id);

  item.contributions.push({
    user: req.user.id,
    qty,
    date: new Date(),
  });

  await item.save();

  res.json(item);
});

router.get("/project/:projectId/activity", async (req, res) => {
  const activity = await Contribution.find({
    project: req.params.projectId,
  })
    .populate("user", "username")
    .populate("item", "name")
    .sort({ createdAt: -1 })
    .limit(20);

  res.json(activity);
});

router.get("/project/:projectId/activity", async (req, res) => {
  const activity = await Contribution.find({
    project: req.params.projectId,
  })
    .populate("user", "username")
    .populate("item", "name")
    .sort({ createdAt: -1 })
    .limit(20);

  res.json(activity);
});

// DELETE A CONTRIBUTION (not the whole item)
router.delete(
  "/:itemId/contribution/:contributionId",
  authMiddleware,
  async (req, res) => {
    try {
      const { itemId, contributionId } = req.params;

      const item = await Item.findById(itemId);

      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      // Remove contribution by ID
      item.contributions = item.contributions.filter(
        (c) => c._id.toString() !== contributionId
      );

      await item.save();

      res.json({ message: "Contribution removed", item });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  }
);

export default router;
