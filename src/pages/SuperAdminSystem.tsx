import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Database, 
  Server, 
  Activity, 
  Zap, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  HardDrive,
  Cpu,
  MemoryStick,
  Globe
} from "lucide-react";
import { useState, useEffect } from "react";

interface SystemMetrics {
  database: {
    status: 'healthy' | 'warning' | 'error';
    connections: number;
    maxConnections: number;
    responseTime: number;
  };
  storage: {
    used: number;
    total: number;
    percentage: number;
  };
  api: {
    uptime: number;
    requestsPerSecond: number;
    errorRate: number;
  };
  resources: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

export default function SuperAdminSystem() {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    database: {
      status: 'healthy',
      connections: 45,
      maxConnections: 100,
      responseTime: 23
    },
    storage: {
      used: 2.3,
      total: 10,
      percentage: 23
    },
    api: {
      uptime: 99.98,
      requestsPerSecond: 156,
      errorRate: 0.02
    },
    resources: {
      cpu: 35,
      memory: 68,
      disk: 45
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health</h1>
          <p className="text-muted-foreground">Monitor platform infrastructure and performance</p>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getStatusIcon(metrics.database.status)}
              <span className={`text-lg font-semibold ${getStatusColor(metrics.database.status)}`}>
                {metrics.database.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.database.responseTime}ms response time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Services</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{metrics.api.uptime}%</div>
            <p className="text-xs text-muted-foreground">Uptime (30 days)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Request Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.api.requestsPerSecond}</div>
            <p className="text-xs text-muted-foreground">Requests per second</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{metrics.api.errorRate}%</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Resource Usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Resource Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  CPU Usage
                </span>
                <span className="text-sm">{metrics.resources.cpu}%</span>
              </div>
              <Progress value={metrics.resources.cpu} className="h-2" />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <MemoryStick className="h-4 w-4" />
                  Memory Usage
                </span>
                <span className="text-sm">{metrics.resources.memory}%</span>
              </div>
              <Progress value={metrics.resources.memory} className="h-2" />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Disk Usage
                </span>
                <span className="text-sm">{metrics.resources.disk}%</span>
              </div>
              <Progress value={metrics.resources.disk} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Active Connections</span>
              <span className="font-semibold">{metrics.database.connections}/{metrics.database.maxConnections}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Average Response Time</span>
              <span className="font-semibold">{metrics.database.responseTime}ms</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Storage Used</span>
              <span className="font-semibold">{metrics.storage.used}GB / {metrics.storage.total}GB</span>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Storage Usage</span>
                <span className="text-sm">{metrics.storage.percentage}%</span>
              </div>
              <Progress value={metrics.storage.percentage} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>System Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              All systems are running normally. No critical issues detected.
            </AlertDescription>
          </Alert>
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Memory usage is approaching 70%. Consider monitoring for optimization opportunities.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}