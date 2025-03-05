import subprocess
import sys
import json
import requests

def extract_unique_iec104(pcap_file):
    modbus_command = [
        r'C:\Program Files\Wireshark\tshark.exe',
        "-r", pcap_file,
        "-Y", "tcp.port == 2404",  # Filter IEC 104 traffic
        "-T", "fields",
        "-e", "ip.src",
        '-e', 'eth.src',
        '-e', 'eth.src.oui_resolved',
        '-e', 'ip.ttl',
        '-e', 'tcp.window_size_value',
        '-e', 'tcp.srcport',
        '-e', 'tcp.dstport'
    ]

    try:
        tshark_output = subprocess.check_output(modbus_command, universal_newlines=True)
    except subprocess.CalledProcessError as e:
        return {"error": f"Error running tshark: {str(e)}"}

    assets = []
    unique_ips = set()

    for line in tshark_output.splitlines():
        fields = line.strip().split("\t")
        if len(fields) == 7:
            src_ip, src_mac, vendor, ttl, window_size, srcport, dstport = fields
            role = check_iec104_role(srcport, dstport)
            device = find_device_type(role)

            if src_ip in unique_ips:
                continue  # Avoid duplicates
            unique_ips.add(src_ip)

            cves = get_cves(vendor)
            cpes = get_cpes(vendor)

            assets.append({
                "protocol": "IEC104",
                "ip": src_ip,
                "mac": src_mac,
                "vendor": vendor,
                "role": role,
                "device": device,
                "cves": cves,
                "cpes": cpes
            })

    return {"assets": assets}

def find_device_type(master_or_slave):
    if master_or_slave == "Master":
        return "MTU"
    elif master_or_slave == "Slave":
        return "IED"
    else:
        return "Gateway/Hybrid Device"

def check_iec104_role(src_port, dst_port):
    try:
        src_port = int(src_port)
        dst_port = int(dst_port)
    except ValueError:
        return "Unknown"
    
    if dst_port == 2404: 
        return "Master"
    elif src_port == 2404:
        return "Slave"
    else:
        return "Unknown"

def get_cves(vendor):
    base_url = "https://services.nvd.nist.gov/rest/json/cves/2.0"
    params = {"keywordSearch": vendor, "resultsPerPage": 5}

    try:
        response = requests.get(base_url, params=params)
        response.raise_for_status()
        cve_data = response.json()

        return [{"id": cve["cve"]["id"], "description": cve["cve"]["descriptions"][0]["value"]}
                for cve in cve_data.get("vulnerabilities", [])]
    except requests.RequestException as e:
        return [{"error": f"Error fetching CVEs: {str(e)}"}]

def get_cpes(vendor):
    base_url = "https://services.nvd.nist.gov/rest/json/cpes/2.0"
    params = {"keywordSearch": vendor, "resultsPerPage": 5}

    try:
        response = requests.get(base_url, params=params)
        response.raise_for_status()
        cpe_data = response.json()

        return [{"cpe_name": cpe["cpe"]["cpeName"], "title": cpe.get("title", "N/A")}
                for cpe in cpe_data.get("products", [])]
    except requests.RequestException as e:
        return [{"error": f"Error fetching CPEs: {str(e)}"}]

if __name__ == "__main__":
    pcap_file = sys.argv[1]
    result = extract_unique_iec104(pcap_file)
    print(json.dumps(result, indent=4))