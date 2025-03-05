const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { assert } = require("console");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());

const protocolParsers = [
    "modbusParser.py",
    "dnp3Parser.py"
];

app.post("/upload", upload.single("pcap"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const pcapFile = path.join(__dirname, req.file.path);
    let allAssets = [];
    let packetCount = 0;
    let detectedProtocols = new Set();

    //get total number of packets
    await new Promise((resolve) => {
        exec(`tshark -r ${pcapFile} | wc -l`, (error, stdout) => {
            if (!error) packetCount = parseInt(stdout.trim(), 10) || 0;
            resolve();
        });
    });

    //modbus parser
    const runParser = (parser) => {
        return new Promise((resolve) => {
            exec(`python3 parsers/${parser} ${pcapFile}`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error in ${parser}:`, stderr);
                    return resolve([]); // Don't fail, just skip this parser
                }

                try {
                    const parsedData = JSON.parse(stdout);
                    
                    parsedData.assets.forEach(asset => {
                        if (asset.protocol) {
                            detectedProtocols.add(asset.protocol); //Add protocol name to the set
                        } else {
                            console.warn(`Warning: Asset without protocol found:`, asset);
                        }
                    });

                    resolve(parsedData.assets || []);
                } catch (err) {
                    console.error(`JSON parsing error in ${parser}:`, err);
                    resolve([]);
                }
            });
        });
    };

    //Run all parsers in parallel
    await Promise.all(protocolParsers.map(async (parser) => {
        const assets = await runParser(parser);
        allAssets = [...allAssets, ...assets];
    }));

    //get unique vendors
    const uniqueVendors = new Set(allAssets.map(asset => asset.vendor));

    res.json({
        totalAssets: allAssets.length,
        totalVendors: uniqueVendors.size,
        totalProtocols: detectedProtocols.size,
        assets: allAssets
    });

    fs.unlinkSync(pcapFile);
});

app.listen(5000, () => console.log("Server running on port 5000"));
