import CGIHTTPServer
import BaseHTTPServer

PORT = 8000

Handler = CGIHTTPServer.CGIHTTPRequestHandler

httpd = BaseHTTPServer.HTTPServer(("", PORT), Handler)

print "Serving files at http://localhost:%d" % PORT

httpd.serve_forever()
