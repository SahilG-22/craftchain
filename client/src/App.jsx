import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";
import Login from "./pages/Login";

const API = import.meta.env.VITE_API_URL;

function App() {
  const [items, setItems] = useState([]);
  const [selectedTree, setSelectedTree] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [newItemName, setNewItemName] = useState("");
  const [newRequiredQty, setNewRequiredQty] = useState("");
  const [selectedDependencies, setSelectedDependencies] = useState([]);

  const PROJECT_ID = "6999bf2d3ea91a2b7b32d152";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
      fetchItems();
    }
  }, []);

  const fetchItems = async () => {
    try {
      const res = await axios.get(`${API}/api/items/project/${PROJECT_ID}`);
      setItems(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchTree = async (id) => {
    const res = await axios.get(`${API}/api/items/${id}/full-tree`);
    setSelectedTree(res.data);
  };

  const renderTree = (node) => (
    <div className="ml-4 mt-2">
      <strong>{node.name}</strong>
      {node.dependencies?.map((dep) => (
        <div key={dep._id}>{renderTree(dep)}</div>
      ))}
    </div>
  );

  const contribute = async (id) => {
    try {
      await axios.patch(
        `${API}/api/items/${id}/contribute`,
        { qty: 1 },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      fetchItems();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteContribution = async (itemId, contributionId) => {
    try {
      await axios.delete(
        `${API}/api/items/${itemId}/contribution/${contributionId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      fetchItems();
    } catch (err) {
      console.error(err.response?.data || err.message);
    }
  };

  const toggleDependency = (id) => {
    setSelectedDependencies((prev) =>
      prev.includes(id)
        ? prev.filter((d) => d !== id)
        : [...prev, id]
    );
  };

  const addItem = async () => {
    if (!newItemName.trim() || !newRequiredQty) {
      alert("Fill all fields");
      return;
    }

    try {
      const res = await axios.post(
        `${API}/api/items`,
        {
          name: newItemName.trim(),
          requiredQty: Number(newRequiredQty),
          project: PROJECT_ID,
          dependencies: selectedDependencies,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // Immediately update state so it appears instantly
      setItems((prev) => [...prev, res.data]);

      setNewItemName("");
      setNewRequiredQty("");
      setSelectedDependencies([]);
    } catch (err) {
      console.error(err.response?.data || err.message);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setItems([]);
  };

  if (!isLoggedIn) {
    return (
      <Login
        onLogin={() => {
          setIsLoggedIn(true);
          fetchItems();
        }}
      />
    );
  }

  return (
    <div className="container">
      <div className="title flex justify-between items-center">
        <span>CraftChain</span>
        <button
          onClick={logout}
          className="bg-red-500 px-3 py-1 rounded text-white"
        >
          Logout
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">

        {/* LEFT PANEL */}
        <div className="card">

          <h2 className="mb-3 text-lg font-bold">Add Item</h2>

          <div className="bg-gray-800 p-4 rounded mb-6 space-y-3">
            <input
              type="text"
              placeholder="Item Name"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="w-full p-2 text-black rounded"
            />

            <input
              type="number"
              placeholder="Required Quantity"
              value={newRequiredQty}
              onChange={(e) => setNewRequiredQty(e.target.value)}
              className="w-full p-2 text-black rounded"
            />

            <div>
              <p className="text-sm mb-1">Dependencies:</p>
              <div className="max-h-32 overflow-y-auto bg-gray-700 p-2 rounded">
                {items.map((item) => (
                  <label key={item._id} className="block text-sm">
                    <input
                      type="checkbox"
                      checked={selectedDependencies.includes(item._id)}
                      onChange={() => toggleDependency(item._id)}
                    />
                    {" "}{item.name}
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={addItem}
              className="bg-green-500 w-full py-2 rounded font-semibold"
            >
              Add Item
            </button>
          </div>

          <h2 className="mb-3 text-lg font-bold">Project Items</h2>

          {items.map((item) => {
            const total =
              item.contributions?.reduce((sum, c) => sum + c.qty, 0) || 0;

            return (
              <div
                key={item._id}
                className="border p-4 mb-4 rounded bg-gray-800 cursor-pointer"
                onClick={() => fetchTree(item._id)}
              >
                <h3 className="font-bold">{item.name}</h3>
                <p>Progress: {total} / {item.requiredQty}</p>

                <button
                  className="mt-2 bg-blue-500 px-3 py-1 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    contribute(item._id);
                  }}
                >
                  Contribute 1
                </button>
              </div>
            );
          })}
        </div>

        {/* RIGHT PANEL */}
        <div className="card flex flex-col gap-6">

          <div>
            <h2 className="text-lg font-bold mb-3">Activity Feed</h2>

            {items.flatMap((item) =>
              item.contributions?.map((c) => (
                <div
                  key={c._id}
                  className="mb-3 p-3 bg-gray-700 rounded flex justify-between"
                >
                  <div>
                    <p className="text-sm">
                      <strong>{c.user?.username}</strong> contributed {c.qty} to {item.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(c.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <button
                    className="text-red-400 text-xs"
                    onClick={() => deleteContribution(item._id, c._id)}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>

          <hr className="opacity-30" />

          <div>
            <h2 className="text-lg font-bold mb-3">Dependency Tree</h2>
            {selectedTree
              ? renderTree(selectedTree)
              : <p className="opacity-60">Select an item</p>}
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;
