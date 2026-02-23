/**
 * Security Guardian Filter - Dangerous Command Patterns
 * 
 * CRITICAL: These patterns protect the system from destructive commands
 * Risk Levels:
 * - CRITICAL (100): Auto-block, no exceptions
 * - HIGH (70-90): Require approval
 * - MEDIUM (40-60): Log and allow with warning
 */

// 🔴 CRITICAL - Auto Block (Risk: 100)
export const CRITICAL_PATTERNS = [
    // File System Destruction
    /rm\s+(-rf?|--recursive|--force)\s+(\/|\/\*|~\/\*|\$HOME)/gi,
    /rm\s+.*\s+\/(?!home|tmp|var\/tmp)/gi, // rm anything in root

    // Disk Operations
    /dd\s+if=.*\s+of=\/dev\/(sd[a-z]|hd[a-z]|nvme\d+n\d+)/gi,
    /mkfs\.\w+\s+\/dev\//gi,
    /fdisk\s+\/dev\//gi,
    /parted\s+\/dev\//gi,

    // System Shutdown/Reboot
    /shutdown\s+(-h|--halt|now)/gi,
    /reboot\s+(--force|-f)/gi,
    /init\s+[06]/gi,
    /systemctl\s+(poweroff|halt|reboot)/gi,

    // Kernel Modification
    /insmod\s+/gi,
    /rmmod\s+/gi,
    /modprobe\s+(-r|--remove)/gi,

    // Fork Bombs
    /:\(\)\s*\{\s*:\|:\&\s*\};:/gi, // :(){ :|:& };:
    /\$\(.*\$\(.*\$\(/gi, // Nested command substitution (potential fork bomb)

    // Overwrite Critical Files
    />+\s*\/etc\/(passwd|shadow|sudoers|fstab|hosts)/gi,
    /chmod\s+000\s+\/etc\//gi,

    // Network Attacks
    /iptables\s+(-F|--flush)/gi,
    /ip6tables\s+(-F|--flush)/gi,
    /ufw\s+disable/gi,
    /firewall-cmd\s+--complete-reload/gi,
];

// 🟠 HIGH - Require Approval (Risk: 70-90)
export const HIGH_RISK_PATTERNS = [
    // Package Management (can break system)
    /apt(-get)?\s+(remove|purge|autoremove)\s+.*--force/gi,
    /yum\s+remove\s+.*--nodeps/gi,
    /npm\s+uninstall\s+-g\s+/gi,

    // User Management
    /userdel\s+-r\s+/gi,
    /passwd\s+root/gi,
    /usermod\s+-aG\s+sudo/gi,

    // Service Management
    /systemctl\s+(stop|disable)\s+(ssh|sshd|network)/gi,
    /service\s+(ssh|sshd)\s+stop/gi,

    // Cron Jobs (can be used for persistence)
    /crontab\s+-r/gi,
    /echo\s+.*>>\s*\/etc\/cron/gi,

    // Docker Dangerous Operations
    /docker\s+rm\s+-f\s+\$\(docker\s+ps\s+-aq\)/gi, // Remove all containers
    /docker\s+system\s+prune\s+-af/gi,
    /docker\s+volume\s+rm\s+\$\(/gi,

    // Database Operations
    /DROP\s+DATABASE/gi,
    /TRUNCATE\s+TABLE/gi,
    /DELETE\s+FROM\s+.*WHERE\s+1=1/gi,
];

// 🟡 MEDIUM - Log & Allow (Risk: 40-60)
export const MEDIUM_RISK_PATTERNS = [
    // File Permissions
    /chmod\s+777/gi,
    /chown\s+root/gi,

    // Package Installation
    /apt(-get)?\s+install/gi,
    /yum\s+install/gi,
    /pip\s+install/gi,
    /npm\s+install\s+-g/gi,

    // Git Operations
    /git\s+push\s+(-f|--force)/gi,
    /git\s+reset\s+--hard/gi,

    // Docker Build
    /docker\s+build/gi,
    /docker\s+run\s+.*--privileged/gi,
];

// Obfuscation Detection
export const OBFUSCATION_PATTERNS = [
    // Base64 encoding
    /echo\s+.*\|\s*base64\s+-d\s*\|\s*bash/gi,

    // Hex encoding
    /echo\s+.*\|\s*xxd\s+-r\s+-p\s*\|\s*bash/gi,

    // Variable expansion tricks
    /\$\{.*:.*:.*\}/gi, // ${var:offset:length}
    /\$\{.*\/.*\/.*\}/gi, // ${var/pattern/replacement}

    // Command substitution
    /\$\(.*\$\(.*\)\)/gi, // Nested $(...)
    /`.*`.*`.*`/gi, // Nested backticks

    // Unicode/Special chars
    /[\u0000-\u001F\u007F-\u009F]/g, // Control characters

    // Concatenation tricks
    /r''m\s+/gi, // r''m = rm
    /r\$\{\}\s*m/gi, // r${}m = rm
];
