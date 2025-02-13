# from flask import Flask, render_template
# from dotenv import load_dotenv
import os
from flask import Flask, render_template, jsonify, request, Response
from dotenv import load_dotenv
import json
import requests
import traceback

load_dotenv()

app = Flask(__name__)

# Access your API key using os.getenv
# API_KEY = os.getenv('ALPHA_VANTAGE_API_KEY')

@app.route('/')

@app.route('/main') 
def main():
    return render_template('main.html', dropdown_included=True)

def get_perplexity_api_key():
    try:
        # Get the absolute path to the config file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(current_dir, 'static', 'js', 'config.js')
        print(f"Attempting to read config from: {config_path}")

        if not os.path.exists(config_path):
            print(f"ERROR: Config file does not exist at {config_path}")
            return None

        with open(config_path, 'r') as file:
            content = file.read()
            print("Successfully read config file")
            print(f"File content preview: {content[:100]}...")  # Show first 100 chars

            # Find the API key directly
            if 'PERPLEXITY_API_KEY' not in content:
                print("ERROR: PERPLEXITY_API_KEY not found in file content")
                return None

            # Extract the API key value using string manipulation
            start_marker = 'PERPLEXITY_API_KEY: '
            end_marker = "'"
            start_pos = content.find(start_marker) + len(start_marker) + 1  # +1 for the quote
            end_pos = content.find(end_marker, start_pos)
            
            if start_pos == -1 or end_pos == -1:
                print("ERROR: Could not extract API key value")
                return None

            api_key = content[start_pos:end_pos]
            print(f"Successfully extracted API key (first 10 chars): {api_key[:10]}...")
            return api_key

    except Exception as e:
        print(f"ERROR in get_perplexity_api_key: {str(e)}")
        print(f"Current working directory: {os.getcwd()}")
        traceback.print_exc()
        return None

@app.route('/api/chat', methods=['POST'])
def proxy_perplexity():
    try:
        api_key = get_perplexity_api_key()
        if not api_key:
            print("ERROR: Failed to get API key")
            return jsonify({'error': 'API key not found'}), 500

        print(f"Making request to Perplexity API with key: {api_key[:10]}...")
        
        response = requests.post(
            'https://api.perplexity.ai/chat/completions',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            },
            json=request.json,
            stream=True
        )
        
        if not response.ok:
            error_msg = f"Perplexity API error: {response.status_code} - {response.text}"
            print(f"ERROR: {error_msg}")
            return jsonify({'error': error_msg}), response.status_code

        def generate():
            for line in response.iter_lines():
                if line:
                    # Remove any existing 'data: ' prefix and add our own
                    decoded_line = line.decode('utf-8')
                    if decoded_line.startswith('data: '):
                        decoded_line = decoded_line[6:]
                    yield f"data: {decoded_line}\n\n"

        return Response(
            generate(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        )
    except Exception as e:
        error_msg = f"Error in proxy_perplexity: {str(e)}"
        print(f"ERROR: {error_msg}")
        traceback.print_exc()
        return jsonify({'error': error_msg}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=999)
