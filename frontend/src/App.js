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
    const [expandedAsset, setExpandedAsset] = useState(null);

    const toggleExpand = (index) => {
        setExpandedAsset(expandedAsset === index ? null : index);
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
                    <div className="bg-white p-4 rounded-lg shadow-md w-full">
                        <h3 className="text-lg font-semibold mb-4">Asset List</h3>
                        <table className="w-full border-collapse border border-gray-300">
                            <thead>
                                <tr className="bg-gray-200">
                                    <th className="border p-2">Protocol</th>
                                    <th className="border p-2">IP Address</th>
                                    <th className="border p-2">Vendor</th>
                                    <th className="border p-2">Role</th>
                                    <th className="border border-gray-300 px-4 py-2">Expand</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assets.map((asset, index) => (
                                    <React.Fragment key={index}>
                                        <tr className="hover:bg-gray-100 cursor-pointer">
                                            <td className="border p-2">{asset.protocol}</td>
                                            <td className="border p-2">{asset.ip}</td>
                                            <td className="border p-2">{asset.vendor || "Unknown"}</td>
                                            <td className="border p-2">{asset.role || "N/A"}</td>
                                            <td 
                                                className="border border-gray-300 px-4 py-2 text-center align-middle cursor-pointer" 
                                                onClick={() => toggleExpand(index)}
                                            >
                                                <div className="flex justify-center items-center h-full">
                                                    {expandedAsset === index ? <FaMinus /> : <FaPlus />}
                                                </div>
                                            </td>
                                            {/* Expanded row showing CVE and CPE details */}
                                            {expandedAsset === index && (
                                                <tr className="bg-gray-50">
                                                <td colSpan="5" className="p-4 border border-gray-300">
                                                    <strong>CVEs:</strong> {asset.cves.length > 0 
                                                        ? asset.cves.map((cve) => <span key={cve.id}>{cve.id}, </span>) 
                                                        : "No CVEs found"}
                                                    <br />
                                                    <strong>CPEs:</strong> {asset.cpes.length > 0 
                                                        ? asset.cpes.map((cpe) => <span key={cpe.cpe_name}>{cpe.cpe_name}, </span>) 
                                                        : "No CPEs found"}
                                                </td>
                                            </tr>
                                             )}
                                        </tr>
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
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
