import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE = path.join(__dirname, "..", "mcp_state.json");

export interface McpState {
    active_space_id: number;
    active_space_login: string;
    active_space_host: string;
}

const DEFAULT_STATE: McpState = {
    active_space_id: 0,
    active_space_login: "",
    active_space_host: ""
};

/**
 * 读取本地的 mcp_state.json，如果不存在则返回默认个人空间状态 (0, "")
 */
export function readState(): McpState {
    try {
        if (fs.existsSync(STATE_FILE)) {
            const data = fs.readFileSync(STATE_FILE, "utf-8");
            return JSON.parse(data) as McpState;
        }
    } catch (err) {
        console.error(`Failed to read state file: ${err}`);
    }
    return DEFAULT_STATE;
}

/**
 * 将状态对象写入 mcp_state.json
 */
export function writeState(state: McpState): void {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
    } catch (err) {
        console.error(`Failed to write state file: ${err}`);
    }
}
