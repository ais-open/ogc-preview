#!/usr/bin/env bash

CONF_FILE=/usr/local/apache2/conf/extra/geoserver.conf
sed -i 's/geoserver:/'${GEOSERVER_HOSTNAME}':/g' ${CONF_FILE}
sed -i 's/:8080/:'${GEOSERVER_PORT}'/g' ${CONF_FILE}

# Execute whatever command is specified in docker run or CMD statement
exec "$@"