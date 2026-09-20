import { useState, useEffect } from 'react';

// Points to your backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [data, setData] = useState({ products: [], history: [], logs: [] });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [form, setForm] = useState({ name: '', url: '' });

  // Fetch all data on load
  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/dashboard`);
      const json = await res.json();
      setData(json);
      // Auto-select the first product if none is clicked yet
      if (json.products.length > 0 && !selectedProduct) {
        setSelectedProduct(json.products[0].id);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Handle new product submission
  const addProduct = async (e) => {
    e.preventDefault();
    await fetch(`${API_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setForm({ name: '', url: '' }); // Reset form
    fetchData(); // Refresh dashboard
  };

  // Filter data for the currently clicked product
  const history = data.history.filter(h => h.product_id === selectedProduct);
  const logs = data.logs.filter(l => l.product_id === selectedProduct);

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        
        {/* HEADER & FORM */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b pb-6">
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">INE Price Tracker</h1>
          
          <form onSubmit={addProduct} className="flex gap-3 mt-4 md:mt-0 w-full md:w-auto">
            <input
              type="text" placeholder="Product Name" required
              className="border rounded px-4 py-2 text-sm w-full md:w-48 outline-none focus:border-blue-500"
              value={form.name} onChange={e => setForm({...form, name: e.target.value})}
            />
            <input
              type="url" placeholder="Paste INE Store URL" required
              className="border rounded px-4 py-2 text-sm w-full md:w-72 outline-none focus:border-blue-500"
              value={form.url} onChange={e => setForm({...form, url: e.target.value})}
            />
            <button type="submit" className="bg-gray-900 text-white font-medium rounded px-5 py-2 text-sm hover:bg-gray-800 transition">
              Track Item
            </button>
          </form>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          
          {/* SIDEBAR: PRODUCTS LIST */}
          <div className="md:w-1/4">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Tracked Products</h2>
            <ul className="space-y-2">
              {data.products.map(p => (
                <li
                  key={p.id}
                  onClick={() => setSelectedProduct(p.id)}
                  className={`cursor-pointer p-3 rounded-lg border transition-all ${
                    selectedProduct === p.id 
                      ? 'bg-blue-50 border-blue-200 text-blue-800 font-semibold' 
                      : 'bg-white border-gray-100 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {p.name}
                </li>
              ))}
              {data.products.length === 0 && (
                <div className="text-sm text-gray-400 p-2">No products added yet.</div>
              )}
            </ul>
          </div>

          {/* MAIN CONTENT: TABLES */}
          <div className="md:w-3/4 space-y-8">
            {selectedProduct ? (
              <>
                {/* DELIVERABLE: PRICE & STOCK HISTORY */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Price & Stock History</h3>
                  <div className="overflow-hidden border border-gray-200 rounded-lg">
                    <table className="min-w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                        <tr>
                          <th className="px-6 py-3">Date & Time</th>
                          <th className="px-6 py-3">Recorded Price</th>
                          <th className="px-6 py-3">Stock Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {history.length === 0 && (
                          <tr><td colSpan="3" className="px-6 py-8 text-center text-gray-400">Waiting for first successful scrape...</td></tr>
                        )}
                        {history.map(h => (
                          <tr key={h.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3 text-gray-500">{new Date(h.scraped_at).toLocaleString()}</td>
                            <td className="px-6 py-3 font-semibold text-gray-900">₹{h.price}</td>
                            <td className="px-6 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                h.stock_status === 'IN STOCK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {h.stock_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* DELIVERABLE: SCRAPER LOGS */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Scrape Audit Logs</h3>
                  <div className="overflow-hidden border border-gray-200 rounded-lg">
                    <table className="min-w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                        <tr>
                          <th className="px-6 py-3">Attempt Time</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3">System Message</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {logs.length === 0 && (
                          <tr><td colSpan="3" className="px-6 py-8 text-center text-gray-400">No logs recorded yet.</td></tr>
                        )}
                        {logs.map(l => (
                          <tr key={l.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3 text-gray-500">{new Date(l.attempted_at).toLocaleString()}</td>
                            <td className="px-6 py-3">
                              <span className={`font-semibold ${l.status === 'SUCCESS' ? 'text-green-600' : 'text-red-600'}`}>
                                {l.status}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-gray-600 truncate max-w-sm">
                              {l.error_message || 'Price extracted correctly'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 p-12 bg-white rounded-lg border border-gray-200 border-dashed">
                Select a product from the sidebar to view its tracking data.
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default App;