import subprocess
import sys
import json
import shodan
import requests

API_KEY = "gpSCf5dNefLwTHRSzOMZs4V7EO2DvU6r"

def extract_unique_modbus(pcap_file):
    modbus_command = [
        r'C:\Program Files\Wireshark\tshark.exe',
        "-r", pcap_file,
        "-Y", "modbus",
        "-T", "fields",
        "-e", "ip.src",
        "-e", "eth.src",
        "-e", "eth.src.oui_resolved",
        "-e", "ip.ttl",
        "-e", "tcp.window_size_value",
        "-e", "tcp.srcport",
        "-e", "tcp.dstport",
        "-e", "modbus.func_code"
    ]

    try:
        tshark_output = subprocess.check_output(modbus_command, universal_newlines=True)
    except subprocess.CalledProcessError as e:
        return {"error": f"Error running tshark: {str(e)}"}

    assets = []
    unique_ips = set()

    for line in tshark_output.splitlines():
        fields = line.strip().split("\t")
        if len(fields) == 8:
            src_ip, src_mac, vendor, ttl, window_size, srcport, dstport, func_code = fields
            role = check_modbus_role(srcport, dstport)
            device = find_device_type(role)

            if src_ip in unique_ips:
                continue  # Avoid duplicates
            unique_ips.add(src_ip)

            cves = get_cves(vendor)
            cpes = get_cpes(vendor)

            assets.append({
                "protocol": "Modbus",
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
    return "MTU" if master_or_slave == "Master" else "ICS Host" if master_or_slave == "Slave" else "Not Found"

def check_modbus_role(srcport, dstport):
    srcport, dstport = int(srcport), int(dstport)
    if srcport != 502 and dstport == 502:
        return "Master"
    elif srcport == 502 and dstport != 502:
        return "Slave"
    elif srcport == 502 and dstport == 502:
        return "Master/Slave"
    else:
        return "Not Found"

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
    result = extract_unique_modbus(pcap_file)
    print(json.dumps(result, indent=4))
