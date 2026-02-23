/**
 * Docker Tool - Standard Docker command templates
 */

export const DockerTemplates = {
    /**
     * Deploy Nginx container
     */
    deployNginx: (port: number = 80, name: string = 'nginx-server') => {
        return `docker run -d --name ${name} -p ${port}:80 nginx:latest`;
    },

    /**
     * List running containers
     */
    listContainers: () => {
        return 'docker ps';
    },

    /**
     * List all containers (including stopped)
     */
    listAllContainers: () => {
        return 'docker ps -a';
    },

    /**
     * Stop container
     */
    stopContainer: (containerName: string) => {
        return `docker stop ${containerName}`;
    },

    /**
     * Start container
     */
    startContainer: (containerName: string) => {
        return `docker start ${containerName}`;
    },

    /**
     * Remove container
     */
    removeContainer: (containerName: string) => {
        return `docker rm ${containerName}`;
    },

    /**
     * View container logs
     */
    viewLogs: (containerName: string, tail: number = 100) => {
        return `docker logs --tail ${tail} ${containerName}`;
    },

    /**
     * Execute command in container
     */
    exec: (containerName: string, command: string) => {
        return `docker exec ${containerName} ${command}`;
    },

    /**
     * Pull image
     */
    pullImage: (imageName: string) => {
        return `docker pull ${imageName}`;
    },

    /**
     * List images
     */
    listImages: () => {
        return 'docker images';
    },
};

export class DockerTool {
    /**
     * Generate docker-compose.yml content
     */
    static generateComposeFile(config: {
        serviceName: string;
        image: string;
        ports?: string[];
        environment?: Record<string, string>;
        volumes?: string[];
    }): string {
        const { serviceName, image, ports = [], environment = {}, volumes = [] } = config;

        let compose = `version: '3.8'\n\nservices:\n  ${serviceName}:\n    image: ${image}\n`;

        if (ports.length > 0) {
            compose += '    ports:\n';
            ports.forEach(port => {
                compose += `      - "${port}"\n`;
            });
        }

        if (Object.keys(environment).length > 0) {
            compose += '    environment:\n';
            Object.entries(environment).forEach(([key, value]) => {
                compose += `      - ${key}=${value}\n`;
            });
        }

        if (volumes.length > 0) {
            compose += '    volumes:\n';
            volumes.forEach(volume => {
                compose += `      - ${volume}\n`;
            });
        }

        return compose;
    }
}
