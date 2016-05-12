# OGC Preview

## Purpose
Discover, browse and export data from OGC service layers exposed by way of WMS/WFS service interfaces, with a special focus given to time-enabled data.

## Usage
OGC Preview at its core simply a collection of static assets reliant on connectivity to an OGC compliant back-end server.
The primary backend solution is GeoServer and by default the application is configured to connect on the /geoserver 
relative context of the server hosting OGC Preview.

#### Static Deploy

OGC Preview is built into both a WAR and tarball package by Travis CI.  If you already have your reverse proxy 
configuration set for GeoServer and just need the static content you can grab the release artifacts to
deploy in your web server (tarball for Nginx/Apache, WAR for Tomcat/etc.). The releases can be found here:

https://github.com/AppliedIS/ogc-preview/releases

#### Docker

The OGC Preview Docker image contains everything to get up and running quickly to discover data hosted within 
GeoServer. Apache is used to reverse proxy GeoServer within the OGC Preview context at the 
/geoserver relative URL. All that is needed is to map in an already running container
or a remotely hosted GeoServer instance.

Example linking to running GeoServer container (replace first link parameter with your container ID):

    $ docker run -d -P --link yourgeoservercontainer:geoserver appliedis/ogc-preview

Example mapping internal DNS for GeoServer to the IP of externally running GeoServer (replace 192.* IP with environment appropriate): 

    $ docker run -d -P --add-host geoserver:192.168.1.10 appliedis/ogc-preview
    
Once the container has launched, you can find the server and its listening port by using docker ps:

    $ docker ps -f "ancestor=appliedis/ogc-preview"
    
## Build

OGC Preview depends on Gulp as the test runner and build system. The following commands assume npm, bower, gulp and optionally docker installed globally.
The following sections provide the steps necessary to get up and running quickly with a development environment or to build the project.

### Initialize:

    $ npm install
    $ bower install

### Development Server:

    $ gulp

### Build artifacts:

    $ gulp build
    
### Build Docker image:

    $ docker build -t appliedis/ogc-preview .    

## Developed by Applied Information Sciences
