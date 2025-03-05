import React, { useState } from "react";
import axios from "axios";
import { Card, CardContent, Typography, Button, CircularProgress} from "@mui/material";
import {PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend} from "recharts";
import { FaPlus, FaMinus } from "react-icons/fa";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A020F0", "#D2691E"];

function App() {
    const [file, setFile] = useState(null);
    const [assets, setAssets] = useState([]);
    const [totalAssets, setTotalAssets] = useState(0);
    const [totalVendors, setTotalVendors] = useState(0);
    const [totalProtocols, setTotalProtocols] = useState(0);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [dataUploaded, setDataUploaded] = useState(false);  // Track if a file has been uploaded
    const [protocolData, setProtocolData] = useState([]);
    const [vendorData, setVendorData] = useState([]);
    const [expandedAssets, setExpandedAssets] = useState(new Set());

    const toggleExpand = (index) => {
        setExpandedAssets((prevExpanded) => {
            const newExpanded = new Set(prevExpanded);
            if (newExpanded.has(index)) {
                newExpanded.delete(index); // Collapse if already expanded
            } else {
                newExpanded.add(index); // Expand new asset
            }
            return newExpanded;
        });
    };

    const handleUpload = async () => {
        if (!file) {
            setError("Please select a file first.");
            return;
        }

        setLoading(true);
        setError(null);

        //Clear previous results before uploading new file
        setAssets([]);
        setTotalAssets(0);
        setTotalVendors(0);
        setTotalProtocols(0);
        setDataUploaded(false);

        const formData = new FormData();
        formData.append("pcap", file);

        try {
            const response = await axios.post("http://localhost:5000/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const assets = response.data.assets || [];
            setAssets(assets);
            setTotalAssets(response.data.totalAssets || [0]);
            setTotalVendors(response.data.totalVendors || 0);
            setTotalProtocols(response.data.totalProtocols || 0);
            setDataUploaded(true);
            setError(null);

            //Extracting data for pie charts
            const protocolCounts = {};
            const vendorCounts = {};
            assets.forEach(asset =>{
                protocolCounts[asset.protocol] = (protocolCounts[asset.protocol] || 0) + 1;
                vendorCounts[asset.vendor] = (vendorCounts[asset.vendor] || 0) + 1;
            });

            setProtocolData(Object.entries(protocolCounts).map(([key, value]) => ({name: key, value})));
            setVendorData(Object.entries(vendorCounts).map(([key, value]) => ({ name: key, value })));
        } catch (err) {
            console.error("Upload failed:", err);
            setError("Failed to upload file.");
        } finally {
          setLoading(false);
        }
    };

    const clearResults = () => {
        setAssets([]);
        setTotalAssets(0);
        setTotalVendors(0);
        setTotalProtocols(0);
        setError(null);
        setFile(null);
        setDataUploaded(false);
    };

    const SummaryCard = ({title, value, data}) => (
        <Card className="shadow-lg flex flex-col items-center justify-center text-center p-6 w-80 h-72">
            <CardContent className="flex flex-col items-center justify-between w-full h-full">
                <Typography variant="h6" className="text-center mb-2"> {title} </Typography>
                <div className="flex justify-center items-center w-full h-44">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data} dataKey="value" cx="50%" cy="50%" outerRadius={40} labelLine={false}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend 
                                verticalAlign="bottom"
                                align="center"
                                wrapperStyle={{ fontSize: "8px", marginTop: "5px" }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <Typography variant="h5" color="primary" className="mt-2" verticalAlign="bottom"> {value} </Typography>
            </CardContent>
        </Card>
    );

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 gap-4">
            <h2 className="text-3xl font-bold mb-6 text-center">OT Asset Identification</h2>

            <div className="flex flex-col items-center gap-6 mb-6 w-full">
                <input 
                    type="file"
                    id="file-upload" 
                    className="hidden" 
                    onChange={(e) => setFile(e.target.files[0])} 
                />

                {/* Custom styled button for uploading files */}
                <label
                    htmlFor="file-upload"
                    className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-300"
                >
                    {file ? `File Selected: ${file.name}` : "Choose file"}
                </label>

                <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleUpload} 
                    disabled={loading}
                    className="mt-60"
                    style={{background: loading ? "transparent" : ""}}
                >
                    {loading ? <CircularProgress size={24} color="primary" /> : "Upload PCAP"}
                </Button>
                {error && <p className="text-red-500">{error}</p>}
            </div>

            {dataUploaded && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 w-full max-w-5xl mx-auto">
                        <SummaryCard title="Total Assets" value={totalAssets} data={protocolData} />
                        <SummaryCard title="Unique Vendors" value={totalVendors} data={vendorData} />
                        <SummaryCard title="Total Protocols" value={totalProtocols} data={protocolData} />
                    </div>

                    {/* Data Table */}
                    <div className="w-full px-6">
                        <h2 className="text-2xl font-semibold mb-6">Assets</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {assets.map((asset, index) => (
                                <div 
                                    key={index} 
                                    className="bg-white shadow-md rounded-lg p-4 relative"
                                >
                                    {/* Main Asset Info */}
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="text-lg font-semibold">{asset.ip}</h3>
                                            <p className="text-sm text-gray-500">Protocol: {asset.protocol}</p>
                                            <p className="text-sm text-gray-500">Vendor: {asset.vendor}</p>
                                            <p className="text-sm text-gray-500">Role: {asset.role}</p>
                                        </div>

                                        {/* Expand/Collapse Button */}
                                        <button 
                                            onClick={() => toggleExpand(index)} 
                                            className="text-gray-600 hover:text-black transition"
                                        >
                                            {expandedAssets.has(index) ? <FaMinus size={18} /> : <FaPlus size={18} />}
                                        </button>
                                    </div>

                                    {/* Expanded Section for CVE & CPE Details */}
                                    {expandedAssets.has(index) && (
                                        <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                                            <h4 className="text-sm font-semibold">CVE Details:</h4>
                                            <p className="text-xs text-gray-700">
                                                {asset.cves.length > 0 ? 
                                                    asset.cves.map((cve) => <span key={cve.id}>{cve.id}, </span>) 
                                                    : "No CVEs found"}
                                            </p>
                                            <h4 className="text-sm font-semibold mt-2">CPE Details:</h4>
                                            <p className="text-xs text-gray-700">
                                                {asset.cpes.length > 0 ? 
                                                    asset.cpes.map((cpe) => <span key={cpe.cpe_name}>{cpe.cpe_name}, </span>) 
                                                    : "No CPEs found"}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Clear Results Button */}
                    <div className="mt-6 mb-20">
                        <Button variant="outlined" color="secondary" onClick={clearResults}>
                            Clear Results
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}

export default App;
