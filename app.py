import os
import re
import time
import requests
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Cache structure to avoid hitting Google's servers on every reload
cache = {
    "data": None,
    "last_fetched": 0
}

CACHE_DURATION = 3600  # 1 hour in seconds
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
ATOM_NS = {"atom": "http://www.w3.org/2005/Atom"}

def parse_html_content(content_html):
    """
    Parses the CDATA HTML content of an entry to extract individual updates
    delimited by <h3> tags.
    """
    if not content_html:
        return []
    
    # Split content by <h3>Type</h3>
    # Using regex to find all matches of <h3>...</h3> and the text between them
    sections = re.split(r'<h3>(.*?)</h3>', content_html)
    
    updates = []
    if len(sections) > 1:
        # If there is content before the first <h3>, capture it as "General"
        if sections[0].strip():
            updates.append({
                "type": "General",
                "html": sections[0].strip()
            })
        
        # Loop through matched headings and their content
        for i in range(1, len(sections), 2):
            if i + 1 < len(sections):
                update_type = sections[i].strip()
                update_html = sections[i+1].strip()
                updates.append({
                    "type": update_type,
                    "html": update_html
                })
    else:
        # If there are no <h3> tags, the entire content is one general update
        updates.append({
            "type": "General",
            "html": content_html.strip()
        })
        
    return updates

def fetch_and_parse_feed(force_refresh=False):
    """
    Fetches the RSS feed and parses it. Uses cache unless expired or force_refresh is True.
    """
    now = time.time()
    if not force_refresh and cache["data"] and (now - cache["last_fetched"] < CACHE_DURATION):
        return cache["data"], "cache"
    
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        
        root = ET.fromstring(response.content)
        entries = root.findall("atom:entry", ATOM_NS)
        
        parsed_entries = []
        for entry in entries:
            title = entry.find("atom:title", ATOM_NS)
            title_text = title.text if title is not None else "Unknown Date"
            
            updated = entry.find("atom:updated", ATOM_NS)
            updated_text = updated.text if updated is not None else ""
            
            link_elem = entry.find("atom:link", ATOM_NS)
            link_url = ""
            if link_elem is not None:
                link_url = link_elem.attrib.get("href", "")
            
            content_elem = entry.find("atom:content", ATOM_NS)
            content_html = content_elem.text if content_elem is not None else ""
            
            updates = parse_html_content(content_html)
            
            parsed_entries.append({
                "date": title_text,
                "updated": updated_text,
                "link": link_url,
                "updates": updates
            })
            
        cache["data"] = parsed_entries
        cache["last_fetched"] = now
        return parsed_entries, "network"
    except Exception as e:
        print(f"Error fetching feed: {e}")
        # Fallback to cache if available, even if expired
        if cache["data"]:
            return cache["data"], "fallback"
        raise e

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/releases")
def get_releases():
    refresh = request.args.get("refresh", "false").lower() == "true"
    try:
        data, source = fetch_and_parse_feed(force_refresh=refresh)
        return jsonify({
            "success": True,
            "source": source,
            "last_fetched": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(cache["last_fetched"])),
            "releases": data
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
