---
title: "Tools for VEX TM"
date: 2025-12-25T16:21:10Z
draft: false
tags:
- Guides
---
As a past VEX competitor, I know how amazing the experience can be when you're at a competition with a great atmosphere. This year, my school is hosting a VEX Competition, so we've decided we're going to take it up a notch. Last year, we managed to live stream the entire event, and use static lights to light the field. 

However, this year, its going to reach a new level. With multi-colour lighting, synchronised music, and automated field management. But how are we going to pull this off? Well, we'll be using an application that I will be building. It's aim is to connect the VEX TM Public API, allowing it to receive live events, such as `matchStarted`  and trigger actions based on this. 

## Interacting with the VEX TM Public API

In order to sync everything up to the matches, we needed to get live data from the VEX Tournament Manager server. To do this, you need to use the VEX TM Public API (check out their documentation for API access). After applying for an API Token from DWAB, I identified the one part of the API I would use the most: the **Field Set WebSocket**, which provides us with live data on the events occurring in a field.

The VEX TM API uses HMAC-SHA256 signatures for authentication, which means every request needs to be properly signed. Here's how I implemented the authentication:

```python
import hmac
import hashlib
from datetime import datetime, timezone

def create_signature(http_verb, uri_path, host, date, token, api_key):
    """
    Creates HMAC-SHA256 signature for VEX TM API requests.
    """
    string_to_sign = (
        f"{http_verb.upper()}\n"
        f"{uri_path}\n"
        f"token:{token}\n"
        f"host:{host}\n"
        f"x-tm-date:{date}\n"
    )
    
    signature = hmac.new(
        api_key.encode(),
        string_to_sign.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return signature
```

Once authenticated, connecting to the WebSocket is straightforward. The WebSocket streams events like `fieldQueued`, `matchStarted`, `audienceDisplayChanged`, and more. Here's a simplified version of the connector:

```python
import asyncio
import websockets
import json

async def connect_to_fieldset(base_url, field_set_id, token, signature, date):
    """
    Connects to VEX TM Field Set WebSocket and listens for events.
    """
    ws_url = f"wss://{base_url}/api/fieldsets/{field_set_id}"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "x-tm-date": date,
        "x-tm-signature": signature
    }
    
    async with websockets.connect(ws_url, extra_headers=headers) as websocket:
        print("Connected to VEX TM WebSocket!")
        
        while True:
            message = await websocket.recv()
            event = json.loads(message)
            
            # Process the event
            print(f"Received event: {event['type']} for field {event.get('field')}")
            await process_event(event)
```

Every event that comes through gets validated, normalized into an `Event` object, and pushed into a central event queue for processing. This architecture ensures we can handle multiple fields simultaneously without blocking.

## Connecting via OSC to the Lighting Board

OSC. Open Sound Control. Why on earth would we be using a 'Sound' protocol to control Lighting? I have no clue. But it works.

OSC makes use of commands sent over a UDP port, and the ZerOS lighting console (the one we're using) supports it natively. Commands follow a simple pattern:

```scheme
/zeros/playback/go/1 
```

This command would trigger playback 1 on the lighting console. Different commands allow you to fire cues, release playbacks, and control various lighting parameters.

Here's how I implemented the OSC controller in Python using the `python-osc` library:

```python
from pythonosc import udp_client
import logging

class ZerOSController:
    def __init__(self, board_ip, port=8830):
        """
        Initialize connection to ZerOS lighting board via OSC.
        """
        self.board_ip = board_ip
        self.port = port
        self.client = udp_client.SimpleUDPClient(self.board_ip, self.port)
        logging.info(f"Initialized OSC client for ZerOS at {board_ip}:{port}")
    
    def execute_action(self, action):
        """
        Execute a lighting action on the ZerOS board.
        Actions contain preset_id, command, and target_type.
        """
        target_id = action.preset_id
        target_type = action.target_type or 'playback'
        command = action.command or 'go'
        
        # Construct OSC address: /zeros/<target_type>/<command>/<target_id>
        address = f"/zeros/{target_type}/{command}/{target_id}"
        
        self.client.send_message(address, None)
        logging.info(f"Sent OSC command to {address}")
```

With this setup, I can trigger different lighting scenes based on match events. For example:
- **Match Queued**: Dim blue lights indicating the field is ready
- **Match Active**: Bright white lights for full visibility
- **Match Complete**: Pulsing green lights to celebrate

The beauty of OSC is that it's fire-and-forget. Send the command and the lighting board handles the rest - no need to wait for responses or manage state.

## Connecting to Spotify

Music makes everything better, and synchronized music makes it *even better*. I wanted the ability to play specific tracks from a playlist based on what's happening in the competition. Enter Spotify's API and the `spotipy` library.

The Spotify controller needed to do a few things:
1. Authenticate using OAuth2
2. Find the right playback device (we're using a dedicated "TM-MUSIC" device)
3. Play specific tracks or random tracks from a playlist
4. Control playback (play, pause, skip)

Here's the implementation:

```python
import spotipy
from spotipy.oauth2 import SpotifyOAuth
import random

class SpotifyController:
    def __init__(self, client_id, client_secret, redirect_uri, device_name=None):
        """
        Initialize Spotify controller with OAuth authentication.
        """
        self.device_name = device_name
        
        # Authenticate with Spotify
        self.sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
            client_id=client_id,
            client_secret=client_secret,
            redirect_uri=redirect_uri,
            scope="user-modify-playback-state user-read-playback-state"
        ))
        
        # Find and set the target device
        self._set_device_id()
    
    def _set_device_id(self):
        """
        Find the Spotify device by name and set its ID.
        """
        devices = self.sp.devices()
        
        if self.device_name:
            for device in devices['devices']:
                if device['name'].lower() == self.device_name.lower():
                    self.device_id = device['id']
                    return
        
        # Fallback to first available device
        self.device_id = devices['devices'][0]['id']
    
    def play_playlist_track(self, playlist_uri, track_number=None):
        """
        Play a specific track from a playlist, or a random one.
        """
        if track_number:
            # Play specific track (1-indexed)
            self.sp.start_playback(
                device_id=self.device_id,
                context_uri=playlist_uri,
                offset={"position": track_number - 1}
            )
        else:
            # Play random track from playlist
            playlist = self.sp.playlist_items(playlist_uri)
            total_tracks = playlist['total']
            random_index = random.randint(0, total_tracks - 1)
            
            self.sp.start_playback(
                device_id=self.device_id,
                context_uri=playlist_uri,
                offset={"position": random_index}
            )
```

Now I can trigger different music based on match context - upbeat tracks during active matches, victory music when a match completes, and calm background music during breaks.

## Connecting to an ATEM

For video production, we're using a Blackmagic ATEM switcher to manage multiple camera feeds. The ATEM needs to automatically switch between cameras based on which field is active. I used the `PyATEMMax` library to control it:

```python
import PyATEMMax

class AtemController:
    def __init__(self, atem_ip):
        """
        Initialize connection to ATEM video switcher.
        """
        self.atem_ip = atem_ip
        self.atem = PyATEMMax.ATEMMax()
        self._connect()
    
    def _connect(self):
        """
        Connect to the ATEM switcher.
        """
        self.atem.connect(self.atem_ip)
        self.atem.waitForConnection(timeout=5)
    
    def execute_action(self, action):
        """
        Switch to a specific camera input.
        """
        camera_id = int(action.camera_id)
        self.atem.changeProgramInput(camera_id)
        logging.info(f"Switched ATEM to camera {camera_id}")
```

With this setup, when a match goes active on Field 1, the system automatically switches the program output to Camera 1, ensuring the live stream always shows the right field.

## Linking it all together

The magic happens in the **Event Processor** - a central component that:
1. Consumes events from the queue
2. Updates field state (stored as JSON files)
3. Looks up action mappings from `actions.json`
4. Executes the appropriate actions on each controller

Here's a simplified flow:

```python
async def process_event(event_queue):
    """
    Main event processing loop.
    """
    while True:
        # Get next event from queue
        event = await event_queue.get()
        
        # Update field state if needed
        if event.field:
            field_state = update_field_state(event)
        
        # Look up mapped actions for this event
        actions = get_actions_for_event(event.type, event.field, field_state)
        
        # Execute each action
        for action in actions:
            if action.type == "lighting":
                zeros_controller.execute_action(action)
            elif action.type == "video":
                atem_controller.execute_action(action)
            elif action.type == "audio":
                spotify_controller.execute_action(action)
        
        # Log the event for audit trail
        log_audit_entry(event, actions)
```

The action mappings live in a JSON configuration file, making it easy to customize without touching code:

```json
{
    "on_event": {
        "fieldActivated": [
            {
                "match_name": "*",
                "fields": {
                    "1": [
                        {"type": "lighting", "preset_id": "13"},
                        {"type": "video", "camera_id": "1"},
                        {"type": "audio", "command": "play"}
                    ]
                }
            }
        ]
    }
}
```

### Beyond Automation: The Full System

While the core automation is impressive, the system needed more to be truly production-ready. Here's what else I built:

#### Web Interface for Control and Monitoring

The Flask-based web interface gives operators full control without needing to touch code. The dashboard shows:
- **Real-time field status** for all competition fields (queued, countdown, active, complete)
- **Manual override controls** to trigger any lighting preset, camera switch, or audio action on demand
- **Live event stream** showing recent events from the VEX TM API
- **System logs** for troubleshooting when things inevitably go wrong

The interface also includes a configuration editor where you can modify device IPs, field-to-camera mappings, and action mappings on the fly. No need to SSH into the server or edit JSON files manually - everything is accessible through the browser.

#### Field State Tracking

Each competition field gets its own state file (`field1.json`, `field2.json`, etc.) that tracks:
- Current state (standby → queued → countdown → active → finish)
- Active match ID and name
- Timestamps for state transitions
- Team information for the current match

This persistent state means the system can recover gracefully from crashes - it knows exactly where each field left off. The event processor is the single source of truth for field state, ensuring consistency across all controllers.

#### Intelligent Match Scheduling

Two background threads work together to keep teams informed:

1. **Schedule Fetcher**: Periodically pulls the latest tournament schedule from the VEX TM API and caches it locally. This ensures we have the data even if the TM server becomes temporarily unreachable.

2. **Match Scheduler**: Monitors the cached schedule and automatically enqueues notification events when matches are approaching. Configurable lead time means teams get notified 5 minutes before their match (or whatever interval you set).

These notifications flow through the same event queue as everything else, triggering pop-ups on team room displays and potentially even audio announcements.

#### Public Room Pages for Teams

This was one of my favorite features to build. Teams don't need any credentials - they just navigate to the room page, enter their room number, and get:
- **Embedded YouTube live stream** of their assigned field
- **Automatic pop-up notifications** when their next match is approaching
- **Match queue display** showing upcoming matches for their team

Administrators can configure rooms through a separate management interface, assigning stream URLs and team lists. When the Match Scheduler determines a team's match is imminent, a pop-up appears on their room page with match details - no manual coordination needed.

#### Pause Controls for Safety

During setup, testing, or when troubleshooting issues, you don't want automation firing off unexpectedly. The pause controls let you selectively disable:
- **Video switching** (manual camera control)
- **Audio playback** (silence during setup)
- **Lighting changes** (freeze current state)

These toggles live in `config.json` and are checked by the event processor before executing any action. Even better, changes take effect immediately - no need to restart the system. This was crucial during our testing when we needed to test one system at a time.

## Final Thoughts

Building this system has been an incredible learning experience. From understanding authentication schemes and WebSocket protocols, to working with OSC, Spotify's API, and video switchers - every component taught me something new.

The result? A fully automated competition production system that handles lighting, video, and audio synchronization in real-time. When a match starts, the lights change, the camera switches, and the music plays - all automatically. It's like having a full production crew, but it's just code.

For anyone interested, the full project is available on [GitHub](https://github.com/vmd1/vex-tm-tools). Feel free to check it out, adapt it for your own events, or just see how everything fits together.

---

*Have questions or ideas? Drop a comment below! I'd love to hear from other VEX teams or anyone working on similar event automation projects.*
