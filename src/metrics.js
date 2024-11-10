const config = require('./config')
const os = require('os')

class Metrics {
	constructor() {
		this.requests = {
			all: 0,
			get: 0,
			put: 0,
			post: 0,
			delete: 0
		}
		this.activeUsers = 0
		this.authAttempts = {
			all: 0,
			success: 0,
			fail: 0
		}
		this.pizzas = {
			sold: 0,
			creationFailures: 0,
			revenue: 0
		}
		const timer = setInterval(() => {
			this.sendHTTPMetricsToGrafana()
			this.sendAuthMetricsToGrafana()
			this.sendPizzaMetricsToGrafana() // TODO
			this.sendMetricToGrafana(this.createMetricString('user', [], 'total', this.activeUsers))
			this.sendOSMetricsToGrafana()
		}, 10000)
		timer.unref()
	}

	requestTracker(req, res, next) {
		this.requests.all++
		this.requests[req.method.toLowerCase()]++
		next()
	}

	logAuthAttempt(success) {
		this.authAttempts.all++
		if (success) {
			this.authAttempts.success++
			this.activeUsers++
		}
		else {
			this.authAttempts.fail++
		}		
	}

	logLogout() {
		this.activeUsers--
	}

	logPizza(revenue) {
		this.pizzas.sold++
		this.pizzas.revenue += revenue
	}

	logPizzaFailure() {
		this.pizzas.creationFailures++
	}

	sendRequestLatency(req) {
		const metric = this.createMetricString('latency', [['type', 'request']], 'time', performance.now() - req.recvTime)
		this.sendMetricToGrafana(metric)
	}

	sendFactoryLatency(time) {
		const metric = this.createMetricString('latency', [['type', 'pizza_creation']], 'time', time)
		this.sendMetricToGrafana(metric)
	}

	sendHTTPMetricsToGrafana() {
		const allMetrics = this.createMetricString('request', [['method', 'all']], 'total', this.requests.all) + `\n` + 
			this.createMetricString('request', [['method', 'get']], 'total', this.requests.get) + `\n` + 
			this.createMetricString('request', [['method', 'post']], 'total', this.requests.post) + `\n` + 
			this.createMetricString('request', [['method', 'put']], 'total', this.requests.put) + `\n` + 
			this.createMetricString('request', [['method', 'delete']], 'total', this.requests.delete)
		this.sendMetricToGrafana(allMetrics)
	}

	sendAuthMetricsToGrafana() {
		const allMetrics = this.createMetricString('auth', [['status', 'all']], 'total', this.authAttempts.all) + `\n` + 
			this.createMetricString('auth', [['status', 'success']], 'total', this.authAttempts.success) + `\n` + 
			this.createMetricString('auth', [['status', 'fail']], 'total', this.authAttempts.fail)
		this.sendMetricToGrafana(allMetrics)
	}

	sendPizzaMetricsToGrafana() {
		const allMetrics = this.createMetricString('pizza', [['status', 'sold']], 'total', this.pizzas.sold) + `\n` + 
			this.createMetricString('pizza', [['status', 'creation_failure']], 'total', this.pizzas.creationFailures) + `\n` + 
			this.createMetricString('pizza', [], 'revenue', this.pizzas.revenue)
		this.sendMetricToGrafana(allMetrics)
	}

	sendOSMetricsToGrafana() {
		const cpu = getCpuUsagePercentage()
		const mem = getMemoryUsagePercentage()
		const metricString = this.createMetricString('system', [], 'cpu', cpu) + `\n` + 
			this.createMetricString('system', [], 'memory', mem)
		this.sendMetricToGrafana(metricString)
	}

	createMetricString(metricPrefix, tags, metricName, metricValue) {
		const tagStrings = tags.map(([tagName, tagValue]) => `${tagName}=${tagValue}`)
		const tagString = tagStrings.join(',')
		return `${metricPrefix},source=${config.metrics.source}${tagString && ','}${tagString} ${metricName}=${metricValue}`
	}

	sendMetricToGrafana(metricString) {
		fetch(`${config.metrics.url}`, {
      method: 'post',
      body: metricString,
      headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}` },
    })
		.then((response) => {
			if (!response.ok) {
				console.error('Failed to push metrics data to Grafana');
			}
		})
		.catch((error) => {
			console.error('Error pushing metrics:', error);
		});
	}
}

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
}

const metrics = new Metrics()

module.exports = metrics