# Ashfall online co-op test

Use the current Ashfall build containing the LAN session fix and protocol 2.
Copy it to `dist/index.html` beside this README.

```text
ashfall-online/
  ashfall_coop_server.py
  render.yaml
  dist/
    index.html
```

## Test locally

Run `python ashfall_coop_server.py --bind 127.0.0.1 --port 8000` and open
`http://127.0.0.1:8000/?lan=1` in two tabs.

## Deploy on Render

1. Put the files above in a Git repository. A private repository works.
2. In Render, create a Blueprint from that repository. Review the generated
   free Python Web Service and deploy it.
3. When the service is live, open its HTTPS URL with `/?lan=1`. Send that URL
   to the second player. One player hosts and sends the six-digit room code.
   Test with two separate networks, then briefly disconnect and reconnect
   one browser to check recovery.
4. Once the online test passes, use the live co-op URL as the target of the
   Online Co-op link on the itch.io page or build.

The service runs one instance and stores rooms in memory. Restarting or
redeploying the service ends active rooms. The free tier may take time to wake up.
