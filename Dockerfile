FROM httpd:2.4

ADD . /tmp/code/

RUN apt-get update \
    && apt-get install -y npm nodejs-legacy git \
    && cd /tmp/code \
    && npm install gulp bower \
    && npm install \
    && node node_modules/bower/bin/bower install --allow-root \
    && node node_modules/gulp/bin/gulp.js build \
    && cd /usr/local/apache2/htdocs \
    && tar xvf /tmp/code/artifacts/ogcpreview.tar.gz \
    && cp /tmp/code/docker/update-backend.sh /usr/local/bin/ \
    && chmod +x /usr/local/bin/update-backend.sh \
    && cp /tmp/code/docker/geoserver.conf /usr/local/apache2/conf/extra/ \
    && echo "Include conf/extra/geoserver.conf" >> /usr/local/apache2/conf/httpd.conf \
    && echo "LoadModule proxy_module modules/mod_proxy.so" >> /usr/local/apache2/conf/httpd.conf \
    && echo "LoadModule proxy_http_module modules/mod_proxy_http.so" >> /usr/local/apache2/conf/httpd.conf \
    && rm -fr /tmp/code \
    && apt-get purge -y npm nodejs-legacy git \
    && apt-get autoremove \
    && apt-get clean \
    && rm -fr /tmp/npm* \
    && cd

ENV GEOSERVER_HOSTNAME geoserver
ENV GEOSERVER_PORT 8080

EXPOSE 80
ENTRYPOINT ["/usr/local/bin/update-backend.sh"]




