# What is this?
_TODO_
* Developed for Kubernetes clusters
* Perfect? No - only meant for additional security; best for "small" amount of _users_
* Works by whitelisting _users_ public IPv4 for a set of _scopes_ (like `stuff.example.com`) by providing a list of ips for the use in configmaps inside Nginx
* Use this command to reload Nginx on the fly: `TODO`

## Services
* `api` Provides a REST-ful endpoint with WebSockets and documentation
* `config` Applies a given YAML to the database (supports live changes)
* `dashboard` Provides a static set of files as the dashboard, expects the path `/api` to be routed to the `api` service - to change that (e.g. to use an own sub-domain for the api), you have to compile the dashboard yourself...
* `provision` This container uses the `kubectl` command to apply changes to the pods and configmaps

## Getting started

### API, Dashboard & more
All services (except the `dashboard`) need access to a Redis database instance. To run such instance locally, try this (after its [documentation](https://hub.docker.com/_/redis)):

```bash
docker run -v "$(pwd)/redis:/data" -p 6379:6379 redis redis-server --save 60 1 --loglevel warning
```

To configure the services to use this instance, take a look into the `.gitlab/*/Dockerfile` files for the services environment variables.

As you may have noted, the service `config` expects a YAML file to prepare the _scopes_ and _users_. Take a look into the `config.sample.yaml` to learn more!

You then have to expose the `dashboard` and `api` services to the _users_ by e.g. using a Nginx instace as a reverse proxy. For the `dashboard` just proxy requests to the `dashboard` service and for the `api`, ensure the path `/api` of your Nginx is proxied to the `api` service (take a look at [Uvicorn Deployment](https://www.uvicorn.org/deployment/#running-behind-nginx) and the api environment variables).

**Rate limits** are strongly recommended to add an additional layer of security to your api endpoint! Here is an example for a Nginx configuration of the `dashboard` with the `api` service mapped to `/api`:

```nginx
TODO
```

### Configure your Nginx
The `provision` service of this project is compartible with Nginx and its `geo_ip` module. This is achieved by updating a configmap inside the Kubernetes cluster, which holds a list of IPs for the configured _scopes_. As you may have noted, Nginx does not reload the configuration files on its own if any change occurs. For this a small sidecar is required (e.g. below). Furthermore, you also have to configure your Nginx to respect the lists from the (then mounted) configmap. See below for an example too.

Nginx with a sidecar for automatic reloads:
```yaml
TODO
```

Nginx configuration for `geo_ip` lists from an other path:
```nginx
TODO
```