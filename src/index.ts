#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    Tool,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import * as dotenv from "dotenv";
import { readState, writeState } from "./state_manager.js";

dotenv.config();

import fs from "fs";

let YUQUE_COOKIE = process.env.YUQUE_COOKIE;

if (!YUQUE_COOKIE) {
    try {
        const mcpConfig = JSON.parse(fs.readFileSync(".vscode/mcp.json", "utf-8"));
        YUQUE_COOKIE = mcpConfig.mcpServers["yuque-assistant"].env.YUQUE_COOKIE;
    } catch (e) {
        // Ignore
    }
}

if (!YUQUE_COOKIE) {
    console.error("Please set YUQUE_COOKIE in .env or .vscode/mcp.json");
    process.exit(1);
}

// Extract ctoken from cookie for x-csrf-token
const getCsrfToken = (cookie: string) => {
    const match = cookie.match(/ctoken=([^;]+)/);
    return match ? match[1] : "";
};

const csrfToken = getCsrfToken(YUQUE_COOKIE);

const yuqueClient = axios.create({
    baseURL: "https://www.yuque.com/api",
    headers: {
        "Cookie": YUQUE_COOKIE,
        "x-csrf-token": csrfToken,
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.yuque.com/"
    },
});

const listReposTool: Tool = {
    name: "list_yuque_repos",
    description: "Get my Yuque knowledge bases (repositories) list, including book_id.",
    inputSchema: {
        type: "object",
        properties: {},
        required: [],
    },
};

const listSpacesTool: Tool = {
    name: "list_yuque_spaces",
    description: "Get all available Yuque spaces for the current user, including personal and organization spaces. Returns space_id and space_login.",
    inputSchema: {
        type: "object",
        properties: {},
        required: [],
    },
};

const switchSpaceTool: Tool = {
    name: "switch_yuque_space",
    description: "Switch the active working space context for the MCP Server.",
    inputSchema: {
        type: "object",
        properties: {
            space_id: {
                type: "number",
                description: "The ID of the space to switch to (0 for default personal space)."
            },
            space_login: {
                type: "string",
                description: "The login string of the space to switch to (empty string for personal space)."
            }
        },
        required: ["space_id", "space_login"],
    },
};

const createNoteTool: Tool = {
    name: "create_yuque_note",
    description: "Create a new note (document) in a specific Yuque repository (book_id).",
    inputSchema: {
        type: "object",
        properties: {
            book_id: {
                type: "number",
                description: "The ID of the repository (book) to publish to.",
            },
            title: {
                type: "string",
                description: "The title of the new note.",
            },
            body: {
                type: "string",
                description: "The Markdown content body of the note.",
            },
        },
        required: ["book_id", "title", "body"],
    },
};

const listDocsTool: Tool = {
    name: "list_yuque_docs",
    description: "Get the list of documents within a specific repository (book_id), optionally filtering by document title.",
    inputSchema: {
        type: "object",
        properties: {
            book_id: {
                type: "number",
                description: "The ID of the knowledge base (book) to list documents from."
            },
            title_query: {
                type: "string",
                description: "Optional title keyword to search for a specific document. Returns matched documents including their slug."
            }
        },
        required: ["book_id"]
    }
};

const readDocTool: Tool = {
    name: "read_yuque_doc",
    description: "Read a specific document's Markdown content by specifying its knowledge base ID (repo_id) and URL slug. Automatically resolves cross-domain organizations if active space is set.",
    inputSchema: {
        type: "object",
        properties: {
            repo_id: { type: "number", description: "The ID of the knowledge base (book) where the document resides." },
            doc_slug: { type: "string", description: "The URL slug identifier of the document." }
        },
        required: ["repo_id", "doc_slug"]
    }
};

const server = new Server(
    {
        name: "yuque-mcp-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [listReposTool, createNoteTool, listSpacesTool, switchSpaceTool, readDocTool, listDocsTool],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        if (request.params.name === "list_yuque_repos") {
            const state = readState();
            let url = "/mine/personal_books";
            let reqBaseURL = "https://www.yuque.com/api";

            // If active_space is set, fetch books for that specific space/organization
            if (state.active_space_id > 0 && state.active_space_login) {
                // The most reliable internal endpoint for fetching a space's books
                url = `/mine/books`;
                if (state.active_space_host) {
                    reqBaseURL = `${state.active_space_host}/api`;
                }
            }

            const response = await yuqueClient.get(url, { baseURL: reqBaseURL });
            const books = response.data?.data || response.data;

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(books, null, 2),
                    },
                ],
            };
        }

        if (request.params.name === "list_yuque_spaces") {
            const spacesMap = new Map<number, any>();

            // 1. Fetch personal and related spaces from book_stacks
            try {
                const response = await yuqueClient.get("/mine/book_stacks");
                const stacks = response.data?.data || response.data;
                if (stacks && Array.isArray(stacks)) {
                    for (const stack of stacks) {
                        if (stack.books && Array.isArray(stack.books)) {
                            for (const book of stack.books) {
                                const owner = book.user; // 'User' or 'Group'
                                if (owner && !spacesMap.has(owner.id)) {
                                    spacesMap.set(owner.id, {
                                        space_id: owner.id,
                                        space_login: owner.login,
                                        name: owner.name,
                                        type: owner.type,
                                        host: "https://www.yuque.com",
                                    });
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Warning: failed to fetch book_stacks", e);
            }

            // 2. Fetch Organization spaces directly
            try {
                const orgRes = await yuqueClient.get("/mine/organizations");
                const orgs = orgRes.data?.data || orgRes.data;
                if (orgs && Array.isArray(orgs)) {
                    for (const org of orgs) {
                        if (org && !spacesMap.has(org.id)) {
                            spacesMap.set(org.id, {
                                space_id: org.id,
                                space_login: org.login,
                                name: org.name,
                                type: "Organization",
                                host: org.host || `https://${org.login}.yuque.com`,
                            });
                        }
                    }
                }
            } catch (e) {
                console.error("Warning: failed to fetch organizations", e);
            }

            const spaces = Array.from(spacesMap.values());

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(spaces, null, 2),
                    },
                ],
            };
        }

        if (request.params.name === "switch_yuque_space") {
            const { space_id, space_login, space_host } = request.params.arguments as {
                space_id: number;
                space_login: string;
                space_host?: string;
            };

            writeState({ active_space_id: space_id, active_space_login: space_login, active_space_host: space_host || "" });

            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully switched to space id: ${space_id}, login: '${space_login}'. Future requests will be routed to this space.`,
                    },
                ],
            };
        }

        if (request.params.name === "create_yuque_note") {
            const { book_id, title, body } = request.params.arguments as {
                book_id: number;
                title: string;
                body: string;
            };

            // Create a doc via internal API: POST /docs
            const payload = {
                book_id: book_id,
                title: title,
                format: "markdown",
                body: body,
            };

            const state = readState();
            let reqBaseURL = "https://www.yuque.com/api";
            if (state.active_space_host) {
                reqBaseURL = `${state.active_space_host}/api`;
            }

            const response = await yuqueClient.post("/docs", payload, { baseURL: reqBaseURL });

            return {
                content: [
                    {
                        type: "text",
                        text: `Note created successfully. Details: ${JSON.stringify(
                            response.data,
                            null,
                            2
                        )}`,
                    },
                ],
            };
        }

        if (request.params.name === "read_yuque_doc") {
            const { repo_id, doc_slug } = request.params.arguments as {
                repo_id: number;
                doc_slug: string;
            };

            const state = readState();
            let reqBaseURL = "https://www.yuque.com/api";
            if (state.active_space_host) {
                reqBaseURL = `${state.active_space_host}/api`;
            }

            const response = await yuqueClient.get(`/docs/${doc_slug}?book_id=${repo_id}`, { baseURL: reqBaseURL });
            const docData = response.data?.data || response.data;
            const body = docData.body || docData.body_asl || JSON.stringify(docData);

            return {
                content: [
                    {
                        type: "text",
                        text: typeof body === 'string' ? body : JSON.stringify(body, null, 2),
                    },
                ],
            };
        }

        if (request.params.name === "list_yuque_docs") {
            const args = (request.params.arguments || {}) as {
                book_id?: number;
                title_query?: string;
            };

            if (!args.book_id) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Error: book_id is required for list_yuque_docs.",
                        },
                    ],
                    isError: true
                };
            }

            const { book_id, title_query } = args;

            const state = readState();
            let reqBaseURL = "https://www.yuque.com/api";
            if (state.active_space_host) {
                reqBaseURL = `${state.active_space_host}/api`;
            }

            // Using internal API to fetch the docs list for a book
            const response = await yuqueClient.get(`/docs?book_id=${book_id}`, { baseURL: reqBaseURL });
            let docs = response.data?.data || response.data || [];
            if (!Array.isArray(docs)) {
                // Try to grab from a nested list if they changed the internal payload structure
                docs = docs.list || [];
            }
            // Need to clean the object, just keeping core ID mapping properties to prevent large token usage
            let results = docs.map((doc: any) => ({
                id: doc.id,
                slug: doc.slug,
                title: doc.title,
                status: doc.status,
                created_at: doc.created_at,
                updated_at: doc.updated_at
            }));

            if (title_query) {
                const queryLower = title_query.toLowerCase();
                results = results.filter((doc: any) => doc.title && doc.title.toLowerCase().includes(queryLower));
            }

            if (results.length === 0 && title_query) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `No documents found matching the title keyword: '${title_query}' in repository ${book_id}.`,
                        },
                    ],
                };
            }

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(results, null, 2),
                    },
                ],
            };
        }

        throw new Error(`Unknown tool: ${request.params.name}`);
    } catch (error: any) {
        const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        return {
            content: [
                {
                    type: "text",
                    text: `Error calling Yuque API: ${errorMsg}`,
                },
            ],
            isError: true,
        };
    }
});

async function main() {
    const args = process.argv.slice(2);
    if (args.length > 0) {
        // Test mode: call tool directly
        const toolName = args[0];
        console.log(`Testing tool: ${toolName}...`);
        try {
            const req = {
                params: {
                    name: toolName,
                    arguments: {}
                }
            };
            const result = await (server as any).requestHandlers.get("tools/call")(req as any);
            console.log(JSON.stringify(result, null, 2));
        } catch (e) {
            console.error("Test failed:", e);
        }
        process.exit(0);
    }

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Yuque MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
