#!/usr/bin/env node
/* GENERATED FILE -- do not edit. Built from js/discover.mjs + js/rules.json
   by build/bundle.mjs. Edit those and rebuild. */
/*
 * Agentic Access Discovery -- per-machine report (JS runner v0.9)
 *
 * One codebase, two channels:
 *   Node:    node discover.mjs   (or: npx @apono-io/agentic-discovery)
 *   Binary:  deno compile -o agentic-discovery --allow-read --allow-write --allow-env \
 *              --include rules.json discover.mjs      (or: bun build --compile)
 *
 * Lean runner: all host paths, extraction rules, category maps and copy live in rules.json.
 *
 * READ-ONLY, NO NETWORK. The report contains derived identifiers only -- never prompts,
 * content, commands, arguments or files. You review it first; sharing is your choice.
 */
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");

const VERSION = "0.9";
const HOME = os.homedir();
const R = {
  "rulesVersion": "0.9",
  "verbOrder": [
    "admin",
    "delete",
    "create",
    "update",
    "read"
  ],
  "verbs": {
    "read": [
      "get",
      "list",
      "search",
      "fetch",
      "read",
      "describe",
      "show",
      "lookup",
      "find",
      "status",
      "check",
      "view",
      "count",
      "head",
      "tail",
      "cat",
      "download",
      "query",
      "select",
      "watch",
      "log",
      "logs",
      "info",
      "userinfo",
      "atlassianuserinfo"
    ],
    "create": [
      "create",
      "add",
      "post",
      "insert",
      "upload",
      "new",
      "clone",
      "copy",
      "init"
    ],
    "update": [
      "update",
      "edit",
      "set",
      "write",
      "put",
      "patch",
      "move",
      "transition",
      "merge",
      "push",
      "change",
      "rename",
      "apply",
      "scale",
      "restart",
      "transfer",
      "assign",
      "reply",
      "comment",
      "resolve",
      "submit",
      "execute",
      "run",
      "start",
      "stop",
      "mute",
      "silence",
      "snooze",
      "acknowledge",
      "ack"
    ],
    "delete": [
      "delete",
      "remove",
      "drop",
      "destroy",
      "terminate",
      "purge",
      "truncate",
      "close"
    ],
    "admin": [
      "grant",
      "revoke",
      "admin",
      "permission",
      "invite",
      "enable",
      "disable",
      "install",
      "uninstall",
      "impersonate",
      "authorize",
      "deauthorize"
    ]
  },
  "controlHints": [
    "iam",
    "user",
    "users",
    "permission",
    "role",
    "grant",
    "revoke",
    "policy",
    "setting",
    "settings",
    "config",
    "admin",
    "org",
    "organization",
    "workspace",
    "member",
    "token",
    "credential",
    "secret",
    "key",
    "account",
    "auth"
  ],
  "sqlArgKeys": [
    "sql",
    "query",
    "statement",
    "command_text"
  ],
  "sqlCats": [
    [
      "admin",
      "\\b(drop|alter|grant|revoke)\\b"
    ],
    [
      "delete",
      "\\b(delete|truncate)\\b"
    ],
    [
      "update",
      "\\bupdate\\b"
    ],
    [
      "create",
      "\\binsert\\b"
    ],
    [
      "read",
      "^\\s*(select|show|explain|describe|with)\\b"
    ]
  ],
  "keyRules": [
    {
      "keys": [
        "target"
      ],
      "whenServer": "^(apono-agentic-local|apono-agentic-remote|apono|apono_mcp|apono_prod|apono-agentic|apono-gateway|apono_gw|apono_staging|apono-prod)$",
      "type": "apono-target",
      "typeFromValue": [
        {
          "match": "knowledge",
          "type": "knowledge-collection"
        },
        {
          "match": "^snowflake[-_]",
          "type": "snowflake"
        },
        {
          "match": "^(postgresql|postgres)[-_]",
          "type": "postgres"
        },
        {
          "match": "^mysql[-_]",
          "type": "mysql"
        },
        {
          "match": "^mongodb[-_]",
          "type": "mongodb"
        },
        {
          "match": "^databricks[-_]",
          "type": "databricks"
        },
        {
          "match": "^aws[-_]",
          "type": "aws"
        },
        {
          "match": "^(gcp|google)[-_]",
          "type": "gcp"
        },
        {
          "match": "^az(ure)?[-_]",
          "type": "azure"
        },
        {
          "match": "^atlassian[-_]",
          "type": "atlassian-site"
        },
        {
          "match": "^github[-_]",
          "type": "github-org"
        },
        {
          "match": "^gitlab[-_]",
          "type": "gitlab-repo"
        },
        {
          "match": "^(mondaycom|monday)[-_]",
          "type": "monday-board"
        },
        {
          "match": "^mixpanel[-_]",
          "type": "mixpanel"
        },
        {
          "match": "^okta[-_]",
          "type": "okta"
        },
        {
          "match": "^(jfrog|artifactory)[-_]",
          "type": "jfrog-repo"
        },
        {
          "match": "k8s|kubernetes|eks|gke|aks",
          "type": "k8s"
        }
      ]
    },
    {
      "keys": [
        "image",
        "image_name",
        "repository"
      ],
      "whenServer": "docker",
      "type": "container-image"
    },
    {
      "keys": [
        "workspace_id",
        "workspace",
        "organization"
      ],
      "whenServer": "terraform",
      "type": "iac-terraform"
    },
    {
      "keys": [
        "site_id",
        "siteId",
        "deploy_id"
      ],
      "whenServer": "netlify",
      "type": "netlify-site"
    },
    {
      "keys": [
        "project_id",
        "projectId",
        "deployment_id"
      ],
      "whenServer": "vercel",
      "type": "vercel-project"
    },
    {
      "keys": [
        "zone_id",
        "zoneId",
        "account_id"
      ],
      "whenServer": "cloudflare",
      "type": "cloudflare"
    },
    {
      "keys": [
        "meeting_id",
        "transcript_id"
      ],
      "whenServer": "fireflies",
      "type": "fireflies-meeting"
    },
    {
      "keys": [
        "guide_id",
        "page_id"
      ],
      "whenServer": "pendo",
      "type": "pendo-resource"
    },
    {
      "keys": [
        "project_id",
        "chart_id"
      ],
      "whenServer": "amplitude",
      "type": "amplitude-project"
    },
    {
      "keys": [
        "path",
        "file_id"
      ],
      "whenServer": "dropbox",
      "type": "dropbox-file"
    },
    {
      "keys": [
        "file_id",
        "folder_id"
      ],
      "whenServer": "box_|^box$",
      "type": "box-file"
    },
    {
      "keys": [
        "spreadsheet_id",
        "spreadsheetId",
        "sheet_id"
      ],
      "whenServer": "gsheet|google_sheet|googlesheet",
      "type": "gsheet"
    },
    {
      "keys": [
        "calendar_id",
        "calendarId",
        "event_id"
      ],
      "whenServer": "gcal|google_calendar|googlecalendar",
      "type": "gcal-calendar"
    },
    {
      "keys": [
        "message_id",
        "thread_id",
        "label_id"
      ],
      "whenServer": "gmail",
      "type": "gmail-mailbox"
    },
    {
      "keys": [
        "file_id",
        "fileId",
        "folder_id"
      ],
      "whenServer": "gdrive|google_drive|googledrive",
      "type": "gdrive-file"
    },
    {
      "keys": [
        "base_id",
        "baseId",
        "table_id",
        "tableId"
      ],
      "whenServer": "airtable",
      "type": "airtable-base"
    },
    {
      "keys": [
        "list_id",
        "template_id"
      ],
      "whenServer": "sendgrid",
      "type": "sendgrid-resource"
    },
    {
      "keys": [
        "account_sid",
        "phone_number",
        "message_sid"
      ],
      "whenServer": "twilio",
      "type": "twilio-resource"
    },
    {
      "keys": [
        "shop",
        "shop_domain",
        "product_id",
        "order_id"
      ],
      "whenServer": "shopify",
      "type": "shopify-shop"
    },
    {
      "keys": [
        "customer",
        "customer_id",
        "subscription",
        "charge_id",
        "invoice"
      ],
      "whenServer": "stripe",
      "type": "stripe-object"
    },
    {
      "keys": [
        "conversation_id",
        "contact_id"
      ],
      "whenServer": "intercom",
      "type": "intercom-conversation"
    },
    {
      "keys": [
        "ticket_id",
        "organization_id"
      ],
      "whenServer": "zendesk",
      "type": "zendesk-ticket"
    },
    {
      "keys": [
        "object_name",
        "sobject",
        "record_id"
      ],
      "whenServer": "salesforce",
      "type": "salesforce-object"
    },
    {
      "keys": [
        "object_id",
        "deal_id",
        "contact_id",
        "company_id"
      ],
      "whenServer": "hubspot",
      "type": "hubspot-object"
    },
    {
      "keys": [
        "board_id"
      ],
      "whenServer": "miro",
      "type": "miro-board"
    },
    {
      "keys": [
        "file_key",
        "fileKey",
        "node_id"
      ],
      "whenServer": "figma",
      "type": "figma-file"
    },
    {
      "keys": [
        "task_id",
        "list_id",
        "space_id"
      ],
      "whenServer": "clickup",
      "type": "clickup-task"
    },
    {
      "keys": [
        "task_gid",
        "project_gid",
        "workspace_gid"
      ],
      "whenServer": "asana",
      "type": "asana-task"
    },
    {
      "keys": [
        "issue_id",
        "team_id",
        "project_id"
      ],
      "whenServer": "linear",
      "type": "linear-issue"
    },
    {
      "keys": [
        "item_id",
        "vault_id",
        "vault"
      ],
      "whenServer": "1password|onepassword|op_",
      "type": "onepassword-item"
    },
    {
      "keys": [
        "path",
        "secret_path",
        "mount"
      ],
      "whenServer": "vault|hashicorp",
      "type": "vault-path"
    },
    {
      "keys": [
        "entity_guid",
        "account_id"
      ],
      "whenServer": "newrelic|new_relic",
      "type": "newrelic-entity"
    },
    {
      "keys": [
        "service_id",
        "incident_id",
        "escalation_policy_id"
      ],
      "whenServer": "pagerduty",
      "type": "pagerduty-service"
    },
    {
      "keys": [
        "dashboard_uid",
        "uid",
        "datasource_uid"
      ],
      "whenServer": "grafana",
      "type": "grafana-dashboard"
    },
    {
      "keys": [
        "monitor_id",
        "dashboard_id",
        "service"
      ],
      "whenServer": "datadog",
      "type": "datadog"
    },
    {
      "keys": [
        "project_slug",
        "project",
        "issue_id",
        "organization_slug"
      ],
      "whenServer": "sentry",
      "type": "sentry-project"
    },
    {
      "keys": [
        "index"
      ],
      "whenServer": "splunk",
      "type": "splunk-index"
    },
    {
      "keys": [
        "index"
      ],
      "whenServer": "elastic|elasticsearch",
      "type": "elastic-index"
    },
    {
      "keys": [
        "database",
        "branch"
      ],
      "whenServer": "planetscale",
      "type": "planetscale-db"
    },
    {
      "keys": [
        "project_id",
        "branch_id"
      ],
      "whenServer": "neon",
      "type": "neon-project"
    },
    {
      "keys": [
        "project_id",
        "project_ref"
      ],
      "whenServer": "supabase",
      "type": "supabase-project"
    },
    {
      "keys": [
        "database",
        "table"
      ],
      "whenServer": "mssql|sqlserver|sql_server",
      "type": "mssql"
    },
    {
      "keys": [
        "database",
        "table"
      ],
      "whenServer": "clickhouse",
      "type": "clickhouse"
    },
    {
      "keys": [
        "dataset",
        "dataset_id",
        "table_id"
      ],
      "whenServer": "bigquery|big_query",
      "type": "bigquery-dataset"
    },
    {
      "keys": [
        "key",
        "db"
      ],
      "whenServer": "redis",
      "type": "redis"
    },
    {
      "keys": [
        "project_id",
        "report_id"
      ],
      "whenServer": "mixpanel",
      "type": "mixpanel"
    },
    {
      "keys": [
        "app_id",
        "appid",
        "group_id",
        "user_id"
      ],
      "whenServer": "okta",
      "type": "okta"
    },
    {
      "keys": [
        "warehouse_id",
        "cluster_id",
        "catalog",
        "job_id"
      ],
      "whenServer": "databricks",
      "type": "databricks"
    },
    {
      "keys": [
        "collection",
        "database",
        "db"
      ],
      "whenServer": "mongo|mongodb",
      "type": "mongodb"
    },
    {
      "keys": [
        "page_id",
        "id"
      ],
      "type": "notion-page",
      "whenTool": "^notion-",
      "valueExtract": "([0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12})",
      "stripChars": "-"
    },
    {
      "keys": [
        "database_id",
        "data_source_id",
        "data_source_url"
      ],
      "type": "notion-database",
      "whenTool": "^notion-",
      "valueExtract": "([0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12})",
      "stripChars": "-"
    },
    {
      "keys": [
        "cloudid"
      ],
      "type": "atlassian-site"
    },
    {
      "keys": [
        "projectkey",
        "projectkeyorid"
      ],
      "type": "jira-project"
    },
    {
      "keys": [
        "spacekey",
        "spaceid"
      ],
      "type": "confluence-space"
    },
    {
      "keys": [
        "pageid"
      ],
      "type": "confluence-page"
    },
    {
      "keys": [
        "repo_key",
        "repository_key",
        "repokey",
        "repo",
        "repository"
      ],
      "type": "jfrog-repo",
      "whenServer": "jfrog|JFrog|artifactory|Artifactory"
    },
    {
      "keys": [
        "project_id",
        "project_path",
        "projectid",
        "namespace",
        "namespace_path"
      ],
      "type": "gitlab-repo",
      "whenServer": "gitlab|GitLab"
    },
    {
      "keys": [
        "group_id",
        "group_path"
      ],
      "type": "gitlab-group",
      "whenServer": "gitlab|GitLab"
    },
    {
      "keys": [
        "repo",
        "repository"
      ],
      "type": "github-repo"
    },
    {
      "keys": [
        "owner",
        "org",
        "organization"
      ],
      "type": "github-org"
    },
    {
      "keys": [
        "database",
        "db_name",
        "dbname"
      ],
      "type": "db-database"
    },
    {
      "keys": [
        "schema"
      ],
      "type": "db-schema"
    },
    {
      "keys": [
        "table",
        "table_name"
      ],
      "type": "db-table"
    },
    {
      "keys": [
        "warehouse"
      ],
      "type": "db-warehouse"
    },
    {
      "keys": [
        "collection"
      ],
      "type": "knowledge-collection"
    },
    {
      "keys": [
        "board_id",
        "boardid"
      ],
      "type": "monday-board"
    },
    {
      "keys": [
        "channel",
        "channel_id"
      ],
      "type": "slack-channel"
    },
    {
      "keys": [
        "bucket"
      ],
      "type": "aws"
    },
    {
      "keys": [
        "cluster",
        "namespace"
      ],
      "type": "k8s"
    }
  ],
  "jiraIssueKeys": [
    "issueidorkey",
    "issuekey"
  ],
  "urlKeys": [
    "url",
    "uri",
    "endpoint",
    "host",
    "hostname"
  ],
  "cliVerbCats": {
    "read": [
      "describe",
      "get",
      "list",
      "ls",
      "download",
      "dl",
      "search",
      "ping",
      "show",
      "query",
      "select"
    ],
    "create": [
      "create",
      "put",
      "run",
      "start",
      "add",
      "attach"
    ],
    "update": [
      "update",
      "modify",
      "set",
      "tag",
      "scale",
      "apply",
      "restart"
    ],
    "delete": [
      "delete",
      "terminate",
      "remove",
      "rm",
      "detach"
    ],
    "admin": [
      "grant",
      "revoke",
      "enable",
      "disable"
    ]
  },
  "commandPrefixSkip": [
    "sudo",
    "env",
    "time",
    "nohup",
    "command",
    "exec",
    "builtin",
    "do",
    "then",
    "else",
    "elif",
    "!",
    "{",
    "}",
    "(",
    ")",
    "&&",
    "||"
  ],
  "shellInterpreterRegex": "^(?:\\S*/)?(?:sh|bash|zsh|dash|ksh)\\s+(?:-[A-Za-z]+\\s+)*-[A-Za-z]*c\\s+(['\"])([\\s\\S]*?)\\1",
  "maxNestedShellDepth": 2,
  "shellRules": [
    {
      "kind": "cloud",
      "bin": "aws",
      "via": "aws",
      "regex": "\\baws\\s+([a-z0-9-]+)\\s+([a-z0-9-]+)",
      "type": "aws",
      "rid": "aws:$1",
      "verbGroups": [
        2
      ]
    },
    {
      "kind": "cloud",
      "bin": "gcloud",
      "via": "gcloud",
      "regex": "\\bgcloud\\s+([a-z0-9-]+)\\s+(?:[a-z0-9-]+\\s+)?([a-z0-9-]+)",
      "type": "gcp",
      "rid": "gcp:$1",
      "verbGroups": [
        2
      ]
    },
    {
      "kind": "cloud",
      "bin": "az",
      "via": "az",
      "regex": "\\baz\\s+([a-z0-9-]+)\\s+([a-z0-9-]+)",
      "type": "azure",
      "rid": "azure:$1",
      "verbGroups": [
        2
      ]
    },
    {
      "kind": "cloud",
      "bin": "oci",
      "via": "oci",
      "regex": "\\boci\\s+([a-z0-9-]+)\\s+([a-z0-9-]+)(?:\\s+([a-z0-9-]+))?",
      "type": "oci",
      "rid": "oci:$1",
      "verbGroups": [
        3,
        2
      ]
    },
    {
      "kind": "cloud",
      "bin": "kubectl",
      "via": "kubectl",
      "regex": "\\bkubectl\\s+([a-z-]+)(?:[^\\n;|]*?(?:-n|--namespace)[= ]([\\w-]+))?",
      "type": "k8s",
      "rid": "k8s-ns:$2||k8s:cluster",
      "verbGroups": [
        1
      ]
    },
    {
      "kind": "cloud",
      "bin": "psql",
      "via": "psql",
      "regex": "\\bpsql\\b[^\\n;|]*?(?:-h[= ]?|--host[= ])([\\w.-]+)",
      "type": "postgres",
      "rid": "$1",
      "verbGroups": [],
      "sqlFromSegment": true
    },
    {
      "kind": "cloud",
      "bin": "mysql",
      "via": "mysql",
      "regex": "\\bmysql\\b[^\\n;|]*?(?:-h[= ]?|--host[= ])([\\w.-]+)",
      "type": "mysql",
      "rid": "$1",
      "verbGroups": [],
      "sqlFromSegment": true
    },
    {
      "kind": "cloud",
      "bin": "snowsql",
      "via": "snowsql",
      "regex": "\\bsnowsql\\b[^\\n;|]*?(?:-a[= ]?|--accountname[= ])([\\w.-]+)",
      "type": "snowflake",
      "rid": "$1",
      "verbGroups": [],
      "sqlFromSegment": true
    },
    {
      "kind": "cloud",
      "bin": "gh",
      "via": "gh",
      "regex": "\\bgh\\s+(?:pr|issue|repo|api|release)\\s+([a-z]+)?[^\\n;|]*?(?:(?:-R|--repo)[= ]([\\w.-]+/[\\w.-]+)|repos/([\\w.-]+/[\\w.-]+))",
      "type": "github-repo",
      "rid": "$2||$3",
      "verbGroups": [
        1
      ],
      "verbDefault": "get",
      "extraWrite": [
        "merge",
        "comment",
        "edit"
      ]
    },
    {
      "kind": "gitremote",
      "bin": "git",
      "via": "git",
      "regex": "\\bgit\\b[^\\n;|]*\\b(clone|push|pull|fetch)\\b[^\\n;|]*?((?:https?://|git@)[^\\s\"']+)"
    },
    {
      "kind": "cloud",
      "bin": "glab",
      "via": "glab",
      "regex": "\\bglab\\s+(?:mr|issue|repo|api|release|ci|variable)\\s+([a-z-]+)?[^\\n;|]*?(?:(?:-R|--repo)[= ]([\\w.-]+(?:/[\\w.-]+)+)|projects/([\\w.%-]+(?:/[\\w.-]+)*))",
      "type": "gitlab-repo",
      "rid": "$2||$3",
      "verbGroups": [
        1
      ],
      "verbDefault": "get",
      "extraWrite": [
        "merge",
        "comment",
        "note",
        "approve"
      ]
    },
    {
      "kind": "cloud",
      "bin": "jf",
      "via": "jf",
      "type": "jfrog-repo",
      "rid": "$2",
      "verbGroups": [
        1
      ],
      "verbDefault": "get",
      "regex": "\\bjf\\s+(?:rt|artifactory)\\s+(download|dl|search|s|delete|del|copy|cp|move|mv|set-props|sp)\\b[^\\n;|]*?\\b([a-z][\\w.-]*)/",
      "extraWrite": [
        "copy",
        "cp",
        "move",
        "mv",
        "set-props",
        "sp"
      ]
    },
    {
      "kind": "cloud",
      "bin": "jf",
      "via": "jf",
      "type": "jfrog-repo",
      "rid": "$2",
      "verbGroups": [
        1
      ],
      "verbDefault": "get",
      "regex": "\\bjf\\s+(?:rt|artifactory)\\s+(upload|u|deploy)\\b[^\\n;|]*\\s([a-z][\\w.-]*)/",
      "extraWrite": [
        "upload",
        "u",
        "deploy"
      ]
    },
    {
      "kind": "cloud",
      "bin": "jfrog",
      "via": "jfrog",
      "type": "jfrog-repo",
      "rid": "$2",
      "verbGroups": [
        1
      ],
      "verbDefault": "get",
      "regex": "\\bjfrog\\s+(?:rt|artifactory)\\s+(download|dl|search|s|delete|del|copy|cp|move|mv|set-props|sp)\\b[^\\n;|]*?\\b([a-z][\\w.-]*)/",
      "extraWrite": [
        "copy",
        "cp",
        "move",
        "mv",
        "set-props",
        "sp"
      ]
    },
    {
      "kind": "cloud",
      "bin": "jfrog",
      "via": "jfrog",
      "type": "jfrog-repo",
      "rid": "$2",
      "verbGroups": [
        1
      ],
      "verbDefault": "get",
      "regex": "\\bjfrog\\s+(?:rt|artifactory)\\s+(upload|u|deploy)\\b[^\\n;|]*\\s([a-z][\\w.-]*)/",
      "extraWrite": [
        "upload",
        "u",
        "deploy"
      ]
    },
    {
      "kind": "cloud",
      "bin": "mongosh",
      "via": "mongosh",
      "regex": "\\bmongosh\\b[^\\n;|]*?((?:mongodb(?:\\+srv)?://|[\\w.-]+\\.[\\w.-]+/)[\\w.-]+)",
      "type": "mongodb",
      "rid": "$1",
      "verbGroups": [],
      "verbDefault": "get"
    },
    {
      "kind": "cloud",
      "bin": "mongo",
      "via": "mongo",
      "regex": "\\bmongo\\s+((?:mongodb(?:\\+srv)?://)[^\\s\\\"']+)",
      "type": "mongodb",
      "rid": "$1",
      "verbGroups": [],
      "verbDefault": "get"
    },
    {
      "kind": "cloud",
      "bin": "databricks",
      "via": "databricks",
      "regex": "\\bdatabricks\\s+([a-z][a-z-]*)\\s+([a-z][a-z-]*)",
      "type": "databricks",
      "rid": "databricks:$1",
      "verbGroups": [
        2
      ],
      "verbDefault": "get",
      "extraWrite": [
        "submit",
        "run-now",
        "deploy"
      ]
    },
    {
      "kind": "cloud",
      "bin": "okta",
      "via": "okta",
      "regex": "\\bokta\\s+([a-z][a-z-]*)\\s+([a-z][a-z-]*)",
      "type": "okta",
      "rid": "okta:$1",
      "verbGroups": [
        2
      ],
      "verbDefault": "get"
    },
    {
      "kind": "cloud",
      "bin": "redis-cli",
      "via": "redis-cli",
      "regex": "\\bredis-cli\\b[^\\n;|]*?-h\\s+([\\w.-]+)",
      "type": "redis",
      "rid": "$1",
      "verbGroups": [],
      "verbDefault": "get"
    },
    {
      "kind": "cloud",
      "bin": "bq",
      "via": "bq",
      "regex": "\\bbq\\s+(?:--\\S+\\s+)*([a-z][a-z-]*)\\b[^\\n;|]*?([\\w.-]+[:.][\\w.-]+)",
      "type": "bigquery-dataset",
      "rid": "$2",
      "verbGroups": [
        1
      ],
      "verbDefault": "get",
      "extraWrite": [
        "load",
        "insert",
        "mk"
      ]
    },
    {
      "kind": "cloud",
      "bin": "clickhouse-client",
      "via": "clickhouse",
      "regex": "\\bclickhouse-client\\b[^\\n;|]*?(?:--host[= ]([\\w.-]+))",
      "type": "clickhouse",
      "rid": "$1",
      "verbGroups": [],
      "verbDefault": "get"
    },
    {
      "kind": "cloud",
      "bin": "sqlcmd",
      "via": "sqlcmd",
      "regex": "\\bsqlcmd\\b[^\\n;|]*?-S\\s+([\\w.-]+)",
      "type": "mssql",
      "rid": "$1",
      "verbGroups": [],
      "verbDefault": "get"
    },
    {
      "kind": "cloud",
      "bin": "mssql-cli",
      "via": "mssql-cli",
      "regex": "\\bmssql-cli\\b[^\\n;|]*?-S\\s+([\\w.-]+)",
      "type": "mssql",
      "rid": "$1",
      "verbGroups": [],
      "verbDefault": "get"
    },
    {
      "kind": "cloud",
      "bin": "influx",
      "via": "influx",
      "regex": "\\binflux\\s+([a-z][a-z-]*)\\b[^\\n;|]*?(?:-b|--bucket)[= ]([\\w.-]+)",
      "type": "influx-bucket",
      "rid": "$2",
      "verbGroups": [
        1
      ],
      "verbDefault": "get",
      "extraWrite": [
        "write"
      ]
    },
    {
      "kind": "cloud",
      "bin": "supabase",
      "via": "supabase",
      "regex": "\\bsupabase\\s+([a-z][a-z-]*)\\s+([a-z][a-z-]*)",
      "type": "supabase-project",
      "rid": "supabase:$1",
      "verbGroups": [
        2
      ],
      "verbDefault": "get",
      "extraWrite": [
        "push",
        "deploy"
      ]
    },
    {
      "kind": "cloud",
      "bin": "neonctl",
      "via": "neonctl",
      "regex": "\\bneonctl\\s+([a-z][a-z-]*)\\s+([a-z][a-z-]*)",
      "type": "neon-project",
      "rid": "neon:$1",
      "verbGroups": [
        2
      ],
      "verbDefault": "get"
    },
    {
      "kind": "cloud",
      "bin": "dbt",
      "via": "dbt",
      "regex": "\\bdbt\\s+(run|build|seed|snapshot|test|compile|docs|debug|deps)\\b",
      "type": "dbt-project",
      "rid": "dbt",
      "verbGroups": [
        1
      ],
      "verbDefault": "get",
      "extraWrite": [
        "run",
        "build",
        "seed",
        "snapshot"
      ]
    },
    {
      "kind": "cloud",
      "bin": "terraform",
      "via": "terraform",
      "regex": "\\bterraform\\s+(plan|apply|destroy|import|state|refresh|output|show|validate|init|workspace)\\b",
      "type": "iac-terraform",
      "rid": "terraform",
      "verbGroups": [
        1
      ],
      "verbDefault": "get",
      "extraWrite": [
        "apply",
        "import"
      ]
    },
    {
      "kind": "cloud",
      "bin": "terragrunt",
      "via": "terragrunt",
      "regex": "\\bterragrunt\\s+(plan|apply|destroy|import|state|output|init)\\b",
      "type": "iac-terraform",
      "rid": "terragrunt",
      "verbGroups": [
        1
      ],
      "verbDefault": "get",
      "extraWrite": [
        "apply",
        "import"
      ]
    },
    {
      "kind": "cloud",
      "bin": "pulumi",
      "via": "pulumi",
      "regex": "\\bpulumi\\s+(up|preview|destroy|refresh|stack|config)\\b",
      "type": "iac-pulumi",
      "rid": "pulumi",
      "verbGroups": [
        1
      ],
      "verbDefault": "get",
      "extraWrite": [
        "up"
      ]
    },
    {
      "kind": "cloud",
      "bin": "helm",
      "via": "helm",
      "regex": "\\bhelm\\s+(install|upgrade|uninstall|rollback|list|status|get)\\s+([\\w.-]+)",
      "type": "helm-release",
      "rid": "$2",
      "verbGroups": [
        1
      ],
      "verbDefault": "get",
      "extraWrite": [
        "install",
        "upgrade",
        "rollback"
      ]
    },
    {
      "kind": "cloud",
      "bin": "argocd",
      "via": "argocd",
      "regex": "\\bargocd\\s+app\\s+([a-z][a-z-]*)\\s+([\\w.-]+)",
      "type": "argocd-app",
      "rid": "$2",
      "verbGroups": [
        1
      ],
      "verbDefault": "get",
      "extraWrite": [
        "sync",
        "set",
        "create"
      ]
    },
    {
      "kind": "cloud",
      "bin": "eksctl",
      "via": "eksctl",
      "regex": "\\beksctl\\s+([a-z][a-z-]*)\\s+(?:cluster|nodegroup)\\b[^\\n;|]*?(?:--name|--cluster)[= ]([\\w.-]+)",
      "type": "k8s",
      "rid": "$2",
      "verbGroups": [
        1
      ],
      "verbDefault": "get"
    },
    {
      "kind": "cloud",
      "bin": "docker",
      "via": "docker",
      "regex": "\\bdocker\\s+(push|pull)\\s+([\\w.\\-/]+(?::[\\w.-]+)?)",
      "type": "container-image",
      "rid": "$2",
      "verbGroups": [
        1
      ],
      "verbDefault": "get",
      "extraWrite": [
        "push"
      ]
    },
    {
      "kind": "cloud",
      "bin": "podman",
      "via": "podman",
      "regex": "\\bpodman\\s+(push|pull)\\s+([\\w.\\-/]+(?::[\\w.-]+)?)",
      "type": "container-image",
      "rid": "$2",
      "verbGroups": [
        1
      ],
      "verbDefault": "get",
      "extraWrite": [
        "push"
      ]
    },
    {
      "kind": "cloud",
      "bin": "skopeo",
      "via": "skopeo",
      "regex": "\\bskopeo\\s+(copy|inspect|delete)\\s+\\S*?([\\w.-]+\\.[\\w.-]+/[\\w.\\-/]+)",
      "type": "container-image",
      "rid": "$2",
      "verbGroups": [
        1
      ],
      "verbDefault": "get",
      "extraWrite": [
        "copy"
      ]
    },
    {
      "kind": "cloud",
      "bin": "wrangler",
      "via": "wrangler",
      "regex": "\\bwrangler\\s+([a-z0-9][a-z0-9-]*)\\s+([a-z0-9][a-z0-9-]*)",
      "type": "cloudflare",
      "rid": "cloudflare:$1",
      "verbGroups": [
        2
      ],
      "verbDefault": "get",
      "extraWrite": [
        "publish",
        "deploy",
        "put"
      ]
    },
    {
      "kind": "cloud",
      "bin": "vercel",
      "via": "vercel",
      "regex": "\\bvercel\\s+(deploy|env|domains|logs|list|ls|rollback|promote|alias)\\b",
      "type": "vercel-project",
      "rid": "vercel",
      "verbGroups": [
        1
      ],
      "verbDefault": "get",
      "extraWrite": [
        "deploy",
        "promote",
        "rollback"
      ]
    },
    {
      "kind": "cloud",
      "bin": "netlify",
      "via": "netlify",
      "regex": "\\bnetlify\\s+(deploy|env|sites|logs|open|status)\\b",
      "type": "netlify-site",
      "rid": "netlify",
      "verbGroups": [
        1
      ],
      "verbDefault": "get",
      "extraWrite": [
        "deploy"
      ]
    },
    {
      "kind": "cloud",
      "bin": "heroku",
      "via": "heroku",
      "regex": "\\bheroku\\s+([a-z:-]+)\\b[^\\n;|]*?(?:-a|--app)[= ]([\\w.-]+)",
      "type": "heroku-app",
      "rid": "$2",
      "verbGroups": [
        1
      ],
      "verbDefault": "get",
      "extraWrite": [
        "restart",
        "scale"
      ]
    },
    {
      "kind": "cloud",
      "bin": "doctl",
      "via": "doctl",
      "regex": "\\bdoctl\\s+([a-z][a-z-]*)\\s+([a-z][a-z-]*)",
      "type": "digitalocean",
      "rid": "do:$1",
      "verbGroups": [
        2
      ],
      "verbDefault": "get"
    },
    {
      "kind": "cloud",
      "bin": "flyctl",
      "via": "flyctl",
      "regex": "\\bflyctl\\s+([a-z][a-z-]*)\\b[^\\n;|]*?(?:-a|--app)[= ]([\\w.-]+)",
      "type": "fly-app",
      "rid": "$2",
      "verbGroups": [
        1
      ],
      "verbDefault": "get",
      "extraWrite": [
        "deploy"
      ]
    },
    {
      "kind": "cloud",
      "bin": "gsutil",
      "via": "gsutil",
      "regex": "\\bgsutil\\s+([a-z][a-z-]*)\\b[^\\n;|]*?gs://([\\w.-]+)",
      "type": "gcp",
      "rid": "gs://$2",
      "verbGroups": [
        1
      ],
      "verbDefault": "get",
      "extraWrite": [
        "cp",
        "rsync",
        "mv"
      ]
    },
    {
      "kind": "cloud",
      "bin": "vault",
      "via": "vault",
      "regex": "\\bvault\\s+(?:kv\\s+)?([a-z][a-z-]*)\\s+((?:secret|kv|auth|sys|database)/[\\w.\\-/]+)",
      "type": "vault-path",
      "rid": "$2",
      "verbGroups": [
        1
      ],
      "verbDefault": "get",
      "extraWrite": [
        "put",
        "patch"
      ]
    },
    {
      "kind": "cloud",
      "bin": "op",
      "via": "op",
      "regex": "\\bop\\s+(item|document|vault|user|group)\\s+([a-z][a-z-]*)",
      "type": "onepassword-item",
      "rid": "1password:$1",
      "verbGroups": [
        2
      ],
      "verbDefault": "get",
      "extraWrite": [
        "create",
        "edit",
        "share"
      ]
    },
    {
      "kind": "cloud",
      "bin": "tsh",
      "via": "tsh",
      "regex": "\\btsh\\s+(ssh|db|kube|apps|login|ls)\\s+(?:[\\w.-]+@)?([\\w.-]+)",
      "type": "teleport-target",
      "rid": "$2",
      "verbGroups": [
        1
      ],
      "verbDefault": "get"
    },
    {
      "kind": "cloud",
      "bin": "aws-vault",
      "via": "aws-vault",
      "regex": "\\baws-vault\\s+(exec|login|list|add|remove)\\s+([\\w.-]+)",
      "type": "aws",
      "rid": "aws:profile/$2",
      "verbGroups": [
        1
      ],
      "verbDefault": "get",
      "extraWrite": [
        "add"
      ]
    },
    {
      "kind": "cloud",
      "bin": "saml2aws",
      "via": "saml2aws",
      "regex": "\\bsaml2aws\\s+(login|exec|list-roles|configure)\\b",
      "type": "aws",
      "rid": "aws:federated-login",
      "verbGroups": [
        1
      ],
      "verbDefault": "get"
    },
    {
      "kind": "cloud",
      "bin": "sentry-cli",
      "via": "sentry",
      "regex": "\\bsentry-cli\\s+([a-z][a-z-]*)\\b[^\\n;|]*?(?:-p|--project)[= ]([\\w.-]+)",
      "type": "sentry-project",
      "rid": "$2",
      "verbGroups": [
        1
      ],
      "verbDefault": "get",
      "extraWrite": [
        "upload",
        "set-commits",
        "new",
        "finalize",
        "deploys"
      ]
    },
    {
      "kind": "cloud",
      "bin": "datadog-ci",
      "via": "datadog",
      "regex": "\\bdatadog-ci\\s+([a-z][a-z-]*)\\s+([a-z][a-z-]*)",
      "type": "datadog",
      "rid": "datadog:$1",
      "verbGroups": [
        2
      ],
      "verbDefault": "get",
      "extraWrite": [
        "upload"
      ]
    },
    {
      "kind": "cloud",
      "bin": "stripe",
      "via": "stripe",
      "regex": "\\bstripe\\s+([a-z][a-z_]*)\\s+([a-z][a-z_]*)",
      "type": "stripe-object",
      "rid": "stripe:$1",
      "verbGroups": [
        2
      ],
      "verbDefault": "get",
      "extraWrite": [
        "create",
        "update",
        "cancel"
      ]
    },
    {
      "kind": "cloud",
      "bin": "twilio",
      "via": "twilio",
      "regex": "\\btwilio\\s+api:([a-z0-9][a-z0-9:_-]*)\\s+([a-z]+)",
      "type": "twilio-resource",
      "rid": "twilio:$1",
      "verbGroups": [
        2
      ],
      "verbDefault": "get",
      "extraWrite": [
        "create"
      ]
    },
    {
      "kind": "cloud",
      "bin": "sf",
      "via": "sf",
      "regex": "\\bsf\\s+([a-z][a-z-]*)\\s+([a-z][a-z-]*)",
      "type": "salesforce-object",
      "rid": "salesforce:$1",
      "verbGroups": [
        2
      ],
      "verbDefault": "get",
      "extraWrite": [
        "deploy",
        "push"
      ]
    },
    {
      "kind": "cloud",
      "bin": "sfdx",
      "via": "sfdx",
      "regex": "\\bsfdx\\s+(?:force:)?([a-z][a-z:_-]*)\\b",
      "type": "salesforce-object",
      "rid": "salesforce:$1",
      "verbGroups": [],
      "verbDefault": "get"
    },
    {
      "kind": "cloud",
      "bin": "shopify",
      "via": "shopify",
      "regex": "\\bshopify\\s+([a-z][a-z-]*)\\s+([a-z][a-z-]*)",
      "type": "shopify-shop",
      "rid": "shopify:$1",
      "verbGroups": [
        2
      ],
      "verbDefault": "get",
      "extraWrite": [
        "push",
        "deploy"
      ]
    },
    {
      "kind": "cloud",
      "bin": "acli",
      "via": "acli",
      "regex": "\\bacli\\s+(?:jira|confluence)\\s+([a-z][a-z-]*)\\s+([a-z][a-z-]*)",
      "type": "atlassian-site",
      "rid": "atlassian (via acli)",
      "verbGroups": [
        2
      ],
      "verbDefault": "get",
      "extraWrite": [
        "create",
        "update"
      ]
    },
    {
      "kind": "cloud",
      "bin": "gcalcli",
      "via": "gcalcli",
      "regex": "\\bgcalcli\\s+(agenda|list|add|delete|edit|search)\\b",
      "type": "gcal-calendar",
      "rid": "google-calendar",
      "verbGroups": [
        1
      ],
      "verbDefault": "get",
      "extraWrite": [
        "add",
        "edit"
      ]
    },
    {
      "kind": "curl",
      "bin": "curl",
      "via": "curl",
      "regex": "\\bcurl\\b([^\\n;|]*?)(https?://[^\\s\"')]+)"
    }
  ],
  "shellToolNames": [
    "bash",
    "exec_command",
    "shell",
    "local_shell"
  ],
  "webFetchToolNames": [
    "webfetch",
    "web_fetch"
  ],
  "localBuiltins": [
    "read",
    "edit",
    "write",
    "glob",
    "grep",
    "task",
    "todowrite",
    "todoread",
    "askuserquestion",
    "exitplanmode",
    "enterplanmode",
    "notebookedit",
    "monitor",
    "toolsearch",
    "skill",
    "artifact",
    "listagents",
    "sendmessage",
    "workflow",
    "reportfindings",
    "schedulewakeup",
    "senduserfile",
    "structuredoutput"
  ],
  "infraServers": [
    "workspace",
    "cowork",
    "visualize",
    "ccd_session",
    "ccd_directory",
    "session_info",
    "plugins",
    "mcp-registry",
    "scheduled-tasks",
    "claude_preview",
    "terminal",
    "cowork-onboarding",
    "plugin_apono-agentic_apono-feedback"
  ],
  "browserServers": [
    "claude_in_chrome",
    "claude-in-chrome",
    "claude_browser",
    "playwright",
    "puppeteer",
    "browserbase",
    "browser-use"
  ],
  "gatewayAliases": [
    "apono-agentic-local",
    "apono-agentic-remote",
    "apono",
    "apono_mcp",
    "apono_prod",
    "apono-agentic",
    "apono-gateway",
    "apono_gw",
    "apono_staging",
    "apono-prod"
  ],
  "gatewayControlTools": [
    "ask_access_assistant",
    "create_access_request",
    "get_request_details",
    "list_available_resources",
    "list_resources_filtered",
    "_proxy__setup_target",
    "_proxy__list_targets",
    "list_access_requests",
    "list_access_flows",
    "get_access_flow",
    "list_accounts",
    "find_accounts",
    "list_integrations",
    "get_integration"
  ],
  "gatewayWrapperRegex": "^apn_[0-9a-f]+__(.+)$",
  "resourceGroups": {
    "Cloud": [
      "aws",
      "gcp",
      "azure",
      "oci",
      "k8s",
      "cloudflare",
      "digitalocean",
      "fly-app",
      "heroku-app",
      "vercel-project",
      "netlify-site"
    ],
    "Databases": [
      "postgres",
      "mysql",
      "db-database",
      "db-schema",
      "db-table",
      "db-warehouse",
      "snowflake",
      "mongodb",
      "databricks",
      "redis",
      "bigquery-dataset",
      "clickhouse",
      "mssql",
      "supabase-project",
      "neon-project",
      "planetscale-db",
      "influx-bucket",
      "dbt-project"
    ],
    "SaaS apps": [
      "atlassian-site",
      "jira-project",
      "confluence-space",
      "confluence-page",
      "knowledge-collection",
      "monday-board",
      "slack-channel",
      "notion",
      "mixpanel",
      "okta",
      "notion-page",
      "notion-database",
      "linear-issue",
      "asana-task",
      "clickup-task",
      "figma-file",
      "miro-board",
      "hubspot-object",
      "salesforce-object",
      "zendesk-ticket",
      "intercom-conversation",
      "stripe-object",
      "shopify-shop",
      "twilio-resource",
      "sendgrid-resource",
      "airtable-base",
      "gdrive-file",
      "gmail-mailbox",
      "gcal-calendar",
      "gsheet",
      "box-file",
      "dropbox-file",
      "amplitude-project",
      "pendo-resource",
      "fireflies-meeting"
    ],
    "Code hosting": [
      "github-repo",
      "github-org",
      "gitlab-repo",
      "gitlab-group",
      "git-remote"
    ],
    "Web": [
      "web-domain"
    ],
    "Artifact registries": [
      "jfrog-repo"
    ],
    "Brokered via Apono": [
      "apono-target"
    ],
    "Observability & incidents": [
      "sentry-project",
      "datadog",
      "grafana-dashboard",
      "pagerduty-service",
      "newrelic-entity",
      "elastic-index",
      "splunk-index"
    ],
    "Secrets & identity": [
      "vault-path",
      "onepassword-item",
      "teleport-target"
    ],
    "IaC & deployment": [
      "iac-terraform",
      "iac-pulumi",
      "helm-release",
      "argocd-app",
      "container-image"
    ]
  },
  "reportGroups": [
    "Cloud",
    "Databases",
    "SaaS apps",
    "Code hosting",
    "Artifact registries",
    "Web",
    "Brokered via Apono",
    "Observability & incidents",
    "Secrets & identity",
    "IaC & deployment",
    "Other"
  ],
  "rowLimits": {
    "default": 0,
    "note": "0 = no limit. The Markdown report is the only artifact we can rely on receiving, so it must contain every row."
  },
  "maxViaPerResource": 12,
  "hosts": [
    {
      "name": "Claude Code",
      "presence": [
        {
          "root": "home",
          "path": [
            ".claude"
          ],
          "evidence": "~/.claude"
        },
        {
          "root": "home",
          "path": [
            ".claude.json"
          ],
          "evidence": "~/.claude.json"
        }
      ],
      "mcpConfigs": [
        {
          "root": "home",
          "path": [
            ".claude.json"
          ],
          "jsonKeys": [
            "mcpServers"
          ],
          "label": "global config"
        },
        {
          "root": "home",
          "path": [
            ".claude.json"
          ],
          "jsonKeys": [
            "mcpServers"
          ],
          "expandProjects": {
            "key": "projects",
            "childFile": ".mcp.json",
            "childLabel": ".mcp.json"
          },
          "label": "project config"
        }
      ],
      "transcripts": [
        {
          "root": "home",
          "path": [
            ".claude",
            "projects"
          ],
          "suffix": ".jsonl",
          "parser": "claudeStream"
        }
      ]
    },
    {
      "name": "Claude Desktop",
      "presence": [
        {
          "root": "roaming",
          "path": [
            "Claude"
          ],
          "evidence": "Claude app data"
        }
      ],
      "mcpConfigs": [
        {
          "root": "roaming",
          "path": [
            "Claude",
            "claude_desktop_config.json"
          ],
          "jsonKeys": [
            "mcpServers"
          ],
          "label": "desktop config"
        },
        {
          "root": "roaming",
          "path": [
            "Claude",
            "Claude Extensions"
          ],
          "manifestDir": true,
          "label": "desktop extension"
        }
      ],
      "transcripts": [
        {
          "root": "roaming",
          "path": [
            "Claude",
            "local-agent-mode-sessions"
          ],
          "suffix": "audit.jsonl",
          "parser": "claudeStream"
        }
      ],
      "gap": "Chat-mode conversations and claude.ai remote connectors are stored server-side and leave no local trace; only agent-mode sessions are covered."
    },
    {
      "name": "Codex",
      "presence": [
        {
          "root": "home",
          "path": [
            ".codex",
            "config.toml"
          ],
          "evidence": "~/.codex"
        }
      ],
      "mcpConfigs": [
        {
          "root": "home",
          "path": [
            ".codex",
            "config.toml"
          ],
          "tomlSectionRegex": "^\\[mcp_servers\\.([^\\].]+)\\]",
          "label": "config.toml"
        }
      ],
      "transcripts": [
        {
          "root": "home",
          "path": [
            ".codex",
            "sessions"
          ],
          "suffix": ".jsonl",
          "parser": "codexStream"
        }
      ],
      "gap": "Codex keeps a limited local session history (about a week observed); older activity is not visible."
    },
    {
      "name": "Cursor",
      "presence": [
        {
          "root": "home",
          "path": [
            ".cursor"
          ],
          "evidence": "~/.cursor"
        },
        {
          "root": "roaming",
          "path": [
            "Cursor",
            "User",
            "globalStorage",
            "state.vscdb"
          ],
          "evidence": "Cursor app data"
        }
      ],
      "mcpConfigs": [
        {
          "root": "home",
          "path": [
            ".cursor",
            "mcp.json"
          ],
          "jsonKeys": [
            "mcpServers"
          ],
          "label": "mcp.json"
        },
        {
          "root": "home",
          "path": [
            ".cursor",
            "projects",
            "*",
            "mcps",
            "*",
            "SERVER_METADATA.json"
          ],
          "nameKeys": [
            "serverIdentifier",
            "serverName",
            "name"
          ],
          "label": "cursor per-server metadata"
        }
      ],
      "transcripts": [
        {
          "root": "roaming",
          "path": [
            "Cursor",
            "User",
            "globalStorage",
            "state.vscdb"
          ],
          "parser": "vscodeSqliteSessions",
          "sql": "select composerId from composerHeaders",
          "countRows": true
        },
        {
          "root": "roaming",
          "path": [
            "Cursor",
            "User",
            "globalStorage",
            "state.vscdb"
          ],
          "parser": "vscodeSqliteSessions",
          "sql": "select value from cursorDiskKV where key like 'composerData%'",
          "conversationKey": "conversationMap"
        }
      ],
      "gapStore": "Cursor's local store could not be read on this machine.",
      "gap": "Cursor coverage is presence, configured MCP servers and a session count. Cursor 3.x moved conversation bodies into per-session stores encrypted with AES-GCM, so tool calls are deliberately not read; MCP attribution is available there as providerIdentifier/toolName if we later choose to. Note also that Cursor updates have been observed clearing local chat history, so 'no activity found' can mean history was wiped rather than unused. For forward-looking capture, Cursor's first-party afterMCPExecution hook reports server, tool, arguments and duration directly."
    },
    {
      "name": "VS Code",
      "presence": [
        {
          "root": "roaming",
          "path": [
            "Code",
            "User"
          ],
          "evidence": "VS Code app data"
        },
        {
          "root": "roaming",
          "path": [
            "Code - Insiders",
            "User"
          ],
          "evidence": "VS Code Insiders app data"
        },
        {
          "root": "home",
          "path": [
            ".vscode"
          ],
          "evidence": "~/.vscode"
        },
        {
          "root": "home",
          "path": [
            ".vscode-server"
          ],
          "evidence": "VS Code remote/WSL server"
        },
        {
          "root": "roaming",
          "path": [
            "Code",
            "User",
            "chatSessions"
          ],
          "evidence": "VS Code chat sessions"
        }
      ],
      "mcpConfigs": [
        {
          "root": "roaming",
          "path": [
            "Code",
            "User",
            "mcp.json"
          ],
          "jsonKeys": [
            "servers",
            "mcpServers"
          ],
          "jsonc": true,
          "label": "VS Code user mcp.json"
        },
        {
          "root": "roaming",
          "path": [
            "Code - Insiders",
            "User",
            "mcp.json"
          ],
          "jsonKeys": [
            "servers",
            "mcpServers"
          ],
          "jsonc": true,
          "label": "VS Code Insiders mcp.json"
        },
        {
          "root": "roaming",
          "path": [
            "Code",
            "User",
            "settings.json"
          ],
          "jsonKeys": [
            "mcp.servers",
            "chat.mcp.servers"
          ],
          "jsonc": true,
          "label": "VS Code settings.json"
        }
      ],
      "transcripts": [
        {
          "root": "roaming",
          "path": [
            "Code",
            "User",
            "workspaceStorage"
          ],
          "suffix": [
            ".jsonl",
            ".json"
          ],
          "mustContain": "chatSessions",
          "parser": "vscodeChatSessions"
        },
        {
          "root": "roaming",
          "path": [
            "Code",
            "User",
            "globalStorage"
          ],
          "suffix": [
            ".jsonl",
            ".json"
          ],
          "mustContain": "chatSessions",
          "parser": "vscodeChatSessions"
        },
        {
          "root": "roaming",
          "path": [
            "Code - Insiders",
            "User",
            "workspaceStorage"
          ],
          "suffix": [
            ".jsonl",
            ".json"
          ],
          "mustContain": "chatSessions",
          "parser": "vscodeChatSessions"
        }
      ],
      "gap": "VS Code coverage reads chat/agent session files, which record tool calls including terminal commands. Workspace-level .vscode/mcp.json files are not scanned, so a server configured only for one project is not listed. Session files are pruned by VS Code over time, so 'no activity found' can mean history aged out rather than unused."
    },
    {
      "name": "GitHub Copilot",
      "presence": [
        {
          "root": "home",
          "path": [
            ".vscode",
            "extensions"
          ],
          "childPrefix": "github.copilot-",
          "evidence": "VS Code extension"
        },
        {
          "root": "home",
          "path": [
            ".vscode-insiders",
            "extensions"
          ],
          "childPrefix": "github.copilot-",
          "evidence": "VS Code Insiders extension"
        },
        {
          "root": "home",
          "path": [
            ".vscode-server",
            "extensions"
          ],
          "childPrefix": "github.copilot-",
          "evidence": "VS Code (WSL remote) extension"
        },
        {
          "root": "home",
          "path": [
            ".copilot"
          ],
          "evidence": "Copilot CLI"
        },
        {
          "root": "home",
          "path": [
            ".local",
            "share",
            "gh",
            "extensions",
            "gh-copilot"
          ],
          "evidence": "gh copilot extension"
        }
      ],
      "mcpConfigs": [
        {
          "root": "home",
          "path": [
            ".copilot",
            "mcp-config.json"
          ],
          "jsonKeys": [
            "mcpServers",
            "servers"
          ],
          "label": "Copilot CLI mcp-config.json"
        }
      ],
      "gap": "Copilot's own CLI keeps no readable local tool history: for the CLI this is presence and configured MCP servers only. Copilot Chat inside VS Code is covered under VS Code, whose session files do record tool calls."
    },
    {
      "name": "Google Antigravity",
      "presence": [
        {
          "root": "home",
          "path": [
            ".gemini",
            "antigravity-ide"
          ],
          "evidence": "~/.gemini/antigravity-ide (IDE 2.x)"
        },
        {
          "root": "home",
          "path": [
            ".gemini",
            "antigravity"
          ],
          "evidence": "~/.gemini/antigravity (IDE 1.x)"
        },
        {
          "root": "home",
          "path": [
            ".gemini",
            "antigravity-cli"
          ],
          "evidence": "~/.gemini/antigravity-cli (CLI)"
        },
        {
          "root": "home",
          "path": [
            ".antigravity-ide"
          ],
          "evidence": "~/.antigravity-ide"
        },
        {
          "root": "roaming",
          "path": [
            "Antigravity IDE"
          ],
          "evidence": "Antigravity IDE app data (2.x)"
        },
        {
          "root": "roaming",
          "path": [
            "Antigravity"
          ],
          "evidence": "Antigravity app data (1.x)"
        },
        {
          "root": "home",
          "path": [
            ".gemini",
            "antigravity-browser-profile"
          ],
          "evidence": "browser-control Chrome profile"
        }
      ],
      "mcpConfigs": [
        {
          "root": "home",
          "path": [
            ".gemini",
            "config",
            "mcp_config.json"
          ],
          "jsonKeys": [
            "mcpServers"
          ],
          "disabledFlagKey": "disabled",
          "label": "gemini mcp_config.json (2.x, unified)"
        },
        {
          "root": "home",
          "path": [
            ".gemini",
            "antigravity",
            "mcp_config.json"
          ],
          "jsonKeys": [
            "mcpServers"
          ],
          "disabledFlagKey": "disabled",
          "label": "antigravity mcp_config.json (1.x)"
        },
        {
          "root": "home",
          "path": [
            ".gemini",
            "antigravity-cli",
            "mcp_config.json"
          ],
          "jsonKeys": [
            "mcpServers"
          ],
          "disabledFlagKey": "disabled",
          "label": "antigravity-cli mcp_config.json"
        }
      ],
      "gap": "Antigravity coverage is presence and configured MCP servers only. IDE conversation files (~/.gemini/antigravity-ide/conversations/*.pb) are encrypted with Electron safeStorage, so their tool calls are deliberately not read. The CLI does write plaintext JSONL transcripts including tool calls (~/.gemini/antigravity-cli/brain/<id>/.system_generated/logs/transcript_full.jsonl) -- extracting those needs a format-specific parser, not yet written. Workspace-local .agents/mcp_config.json files are not enumerated. Enterprise deployments can obtain agent tool-execution audit centrally via the Gemini Enterprise admin console."
    }
  ],
  "agentOrder": [
    "Claude Code",
    "Claude Desktop",
    "Codex",
    "Cursor",
    "VS Code",
    "GitHub Copilot"
  ],
  "genericGaps": [
    "Access types are classified locally from tool names and command verbs; \"unclassified\" means no safe determination could be made -- it is never guessed.",
    "Command-line access is counted only where a tool was actually invoked as a command. Command text quoted inside other commands, heredocs or scripts is deliberately ignored, so genuine access run inside a non-shell interpreter may be under-reported rather than over-reported."
  ],
  "viaLabels": {
    "cli": "CLI",
    "mcp": "MCP",
    "browser": "Browser",
    "builtin": "Built-in"
  },
  "redaction": {
    "enabled": true,
    "keepLast": 4,
    "minLengthForReveal": 8,
    "mask": "\u2022\u2022\u2022\u2022",
    "tagLength": 4,
    "preservePrefixes": [
      "aws:",
      "gcp:",
      "azure:",
      "oci:",
      "k8s:",
      "k8s-ns:"
    ],
    "defaultSalt": {
      "mode": "emailDomain",
      "sources": [
        {
          "root": "home",
          "path": [
            ".claude.json"
          ],
          "jsonPath": [
            "oauthAccount",
            "emailAddress"
          ]
        },
        {
          "root": "home",
          "path": [
            ".gitconfig"
          ],
          "regex": "email\\s*=\\s*([^\\s]+@[^\\s]+)"
        },
        {
          "env": [
            "EMAIL",
            "GIT_AUTHOR_EMAIL",
            "GIT_COMMITTER_EMAIL"
          ]
        }
      ],
      "note": "Redaction tags are salted with the organization's email domain by default, so every machine in the same organization redacts identically and the reports consolidate. The domain is not a secret -- for an assessment where short names must be unguessable, pass an explicit --salt instead."
    },
    "note": "Resource names are redacted: only the last {keepLast} characters are shown, and only where the name is long enough that this reveals little. Shorter names are masked completely. Every entry carries a short tag (#xxxx) derived from the full name so that distinct resources stay distinct in this report and match up correctly when reports from several machines are combined. The tag is a one-way hash; with an assessment salt (--salt) it cannot be reversed by guessing.",
    "saltFingerprint": {
      "length": 8,
      "note": "A short hash of the salt, printed in the report header so reports can be checked for comparability before merging. It identifies the salt without revealing it; use a high-entropy --salt if the salt itself must resist guessing."
    },
    "machineLabel": {
      "mask": "___",
      "note": "A hostname is usually <person>-<model>. The person segment is masked but keeps its first and last letter, and a short salted tag from the full hostname is appended, giving labels like n___s~b0f-macbook-pro. The readable part lets someone who knows the team recognise the machine; the tag makes collisions negligible, since first letter plus last letter alone collides for roughly 85% of fifty-machine fleets. Labels are lower-cased so one machine cannot produce two spellings, and the mask is fixed-width so the name's length is not disclosed. This is pseudonymous rather than anonymous, deliberately: an unreadable label is not one anybody can act on.",
      "genericPrefixes": [
        "desktop",
        "laptop",
        "pc",
        "win",
        "macbook",
        "imac",
        "workstation",
        "ws",
        "host",
        "vm",
        "ubuntu"
      ],
      "tagLength": 3
    }
  },
  "connectorFingerprints": [
    {
      "toolPattern": "^notion-",
      "name": "Notion"
    },
    {
      "toolPattern": "^(get|create|update|search|edit|transition|addComment|lookup|atlassian)\\w*(Confluence|Jira|Atlassian)",
      "name": "Atlassian"
    },
    {
      "toolPattern": "^(get_board_info|create_item|create_items|change_item_column_values|list_users_and_teams|get_board_items)",
      "name": "monday.com"
    },
    {
      "toolPattern": "^(slack_|conversations_|chat_post)",
      "name": "Slack"
    },
    {
      "toolPattern": "^(figma_|get_figma)",
      "name": "Figma"
    }
  ],
  "serviceRules": [
    {
      "toolPattern": "^notion-",
      "type": "notion",
      "rid": "Notion workspace"
    },
    {
      "toolPattern": "\\w*(Confluence|Jira|Atlassian)\\w*",
      "type": "atlassian-site",
      "rid": "Atlassian (site not named)"
    },
    {
      "toolPattern": "^knowledge_",
      "type": "knowledge-collection",
      "rid": "knowledge (collection not named)"
    },
    {
      "type": "jfrog-repo",
      "rid": "JFrog Artifactory (repo not named)",
      "serverPattern": "jfrog|JFrog|artifactory|Artifactory"
    },
    {
      "type": "gitlab-repo",
      "rid": "GitLab (project not named)",
      "serverPattern": "gitlab|GitLab"
    },
    {
      "serverPattern": "mongo|mongodb",
      "type": "mongodb",
      "rid": "MongoDB (resource not named)"
    },
    {
      "serverPattern": "databricks",
      "type": "databricks",
      "rid": "Databricks (resource not named)"
    },
    {
      "serverPattern": "okta",
      "type": "okta",
      "rid": "Okta (resource not named)"
    },
    {
      "serverPattern": "mixpanel",
      "type": "mixpanel",
      "rid": "Mixpanel (resource not named)"
    },
    {
      "serverPattern": "redis",
      "type": "redis",
      "rid": "Redis (resource not named)"
    },
    {
      "serverPattern": "bigquery|big_query",
      "type": "bigquery-dataset",
      "rid": "BigQuery (resource not named)"
    },
    {
      "serverPattern": "clickhouse",
      "type": "clickhouse",
      "rid": "ClickHouse (resource not named)"
    },
    {
      "serverPattern": "mssql|sqlserver|sql_server",
      "type": "mssql",
      "rid": "SQL Server (resource not named)"
    },
    {
      "serverPattern": "supabase",
      "type": "supabase-project",
      "rid": "Supabase (resource not named)"
    },
    {
      "serverPattern": "neon",
      "type": "neon-project",
      "rid": "Neon (resource not named)"
    },
    {
      "serverPattern": "planetscale",
      "type": "planetscale-db",
      "rid": "PlanetScale (resource not named)"
    },
    {
      "serverPattern": "elastic|elasticsearch",
      "type": "elastic-index",
      "rid": "Elasticsearch (resource not named)"
    },
    {
      "serverPattern": "splunk",
      "type": "splunk-index",
      "rid": "Splunk (resource not named)"
    },
    {
      "serverPattern": "sentry",
      "type": "sentry-project",
      "rid": "Sentry (resource not named)"
    },
    {
      "serverPattern": "datadog",
      "type": "datadog",
      "rid": "Datadog (resource not named)"
    },
    {
      "serverPattern": "grafana",
      "type": "grafana-dashboard",
      "rid": "Grafana (resource not named)"
    },
    {
      "serverPattern": "pagerduty",
      "type": "pagerduty-service",
      "rid": "PagerDuty (resource not named)"
    },
    {
      "serverPattern": "newrelic|new_relic",
      "type": "newrelic-entity",
      "rid": "New Relic (resource not named)"
    },
    {
      "serverPattern": "vault|hashicorp",
      "type": "vault-path",
      "rid": "HashiCorp Vault (resource not named)"
    },
    {
      "serverPattern": "1password|onepassword|op_",
      "type": "onepassword-item",
      "rid": "1Password (resource not named)"
    },
    {
      "serverPattern": "linear",
      "type": "linear-issue",
      "rid": "Linear (resource not named)"
    },
    {
      "serverPattern": "asana",
      "type": "asana-task",
      "rid": "Asana (resource not named)"
    },
    {
      "serverPattern": "clickup",
      "type": "clickup-task",
      "rid": "ClickUp (resource not named)"
    },
    {
      "serverPattern": "figma",
      "type": "figma-file",
      "rid": "Figma (resource not named)"
    },
    {
      "serverPattern": "miro",
      "type": "miro-board",
      "rid": "Miro (resource not named)"
    },
    {
      "serverPattern": "hubspot",
      "type": "hubspot-object",
      "rid": "HubSpot (resource not named)"
    },
    {
      "serverPattern": "salesforce",
      "type": "salesforce-object",
      "rid": "Salesforce (resource not named)"
    },
    {
      "serverPattern": "zendesk",
      "type": "zendesk-ticket",
      "rid": "Zendesk (resource not named)"
    },
    {
      "serverPattern": "intercom",
      "type": "intercom-conversation",
      "rid": "Intercom (resource not named)"
    },
    {
      "serverPattern": "stripe",
      "type": "stripe-object",
      "rid": "Stripe (resource not named)"
    },
    {
      "serverPattern": "shopify",
      "type": "shopify-shop",
      "rid": "Shopify (resource not named)"
    },
    {
      "serverPattern": "twilio",
      "type": "twilio-resource",
      "rid": "Twilio (resource not named)"
    },
    {
      "serverPattern": "sendgrid",
      "type": "sendgrid-resource",
      "rid": "SendGrid (resource not named)"
    },
    {
      "serverPattern": "airtable",
      "type": "airtable-base",
      "rid": "Airtable (resource not named)"
    },
    {
      "serverPattern": "gdrive|google_drive|googledrive",
      "type": "gdrive-file",
      "rid": "Google Drive (resource not named)"
    },
    {
      "serverPattern": "gmail",
      "type": "gmail-mailbox",
      "rid": "Gmail (resource not named)"
    },
    {
      "serverPattern": "gcal|google_calendar|googlecalendar",
      "type": "gcal-calendar",
      "rid": "Google Calendar (resource not named)"
    },
    {
      "serverPattern": "gsheet|google_sheet|googlesheet",
      "type": "gsheet",
      "rid": "Google Sheets (resource not named)"
    },
    {
      "serverPattern": "box_|^box$",
      "type": "box-file",
      "rid": "Box (resource not named)"
    },
    {
      "serverPattern": "dropbox",
      "type": "dropbox-file",
      "rid": "Dropbox (resource not named)"
    },
    {
      "serverPattern": "amplitude",
      "type": "amplitude-project",
      "rid": "Amplitude (resource not named)"
    },
    {
      "serverPattern": "pendo",
      "type": "pendo-resource",
      "rid": "Pendo (resource not named)"
    },
    {
      "serverPattern": "fireflies",
      "type": "fireflies-meeting",
      "rid": "Fireflies (resource not named)"
    },
    {
      "serverPattern": "cloudflare",
      "type": "cloudflare",
      "rid": "Cloudflare (resource not named)"
    },
    {
      "serverPattern": "vercel",
      "type": "vercel-project",
      "rid": "Vercel (resource not named)"
    },
    {
      "serverPattern": "netlify",
      "type": "netlify-site",
      "rid": "Netlify (resource not named)"
    },
    {
      "serverPattern": "terraform",
      "type": "iac-terraform",
      "rid": "Terraform (resource not named)"
    },
    {
      "serverPattern": "docker",
      "type": "container-image",
      "rid": "Docker (resource not named)"
    }
  ],
  "memoryScan": {
    "enabled": true,
    "sources": [
      {
        "root": "home",
        "path": [
          ".claude",
          "CLAUDE.md"
        ],
        "label": "Claude Code global instructions"
      },
      {
        "root": "home",
        "path": [
          ".claude",
          "projects",
          "*",
          "memory"
        ],
        "suffix": ".md",
        "label": "Claude Code memory"
      },
      {
        "fromClaudeProjects": [
          "CLAUDE.md",
          "AGENTS.md"
        ],
        "label": "project instructions"
      }
    ],
    "patterns": [
      {
        "type": "jira-project",
        "regex": "\\b([A-Z][A-Z0-9]{1,9})-\\d+\\b",
        "group": 1
      },
      {
        "type": "atlassian-site",
        "regex": "\\b([a-z0-9-]+\\.atlassian\\.net)\\b",
        "group": 1
      },
      {
        "type": "confluence-page",
        "regex": "atlassian\\.net/wiki/[^\\s)]*?/pages/(\\d+)",
        "group": 1
      },
      {
        "type": "github-repo",
        "regex": "github\\.com/([\\w.-]+/[\\w.-]+?)(?:[/)\\s.]|$)",
        "group": 1
      },
      {
        "type": "notion-page",
        "regex": "notion\\.(?:so|com)/[^\\s)]*?([0-9a-fA-F]{32})",
        "group": 1
      },
      {
        "type": "slack-channel",
        "regex": "(?:^|\\s)#([a-z0-9][a-z0-9._-]{2,40})\\b",
        "group": 1
      },
      {
        "type": "gitlab-repo",
        "regex": "gitlab\\.com/([\\w.-]+(?:/[\\w.-]+)+?)(?:[/)\\s.]|$)",
        "group": 1
      },
      {
        "type": "jfrog-repo",
        "regex": "[\\w-]+\\.jfrog\\.io/(?:artifactory/)?([\\w.-]+)",
        "group": 1
      }
    ],
    "note": "These resources are NAMED in the agent's memory and instruction files. That means the agent has been told about them or has remembered them -- it is not proof that they were accessed; the last column shows which were also seen in the access history. These are matched from prose rather than from tool arguments, so the list is deliberately broad and can include lookalikes (any ABC-123 style identifier reads as a project key)."
  },
  "aponoCatalog": {
    "supported": [
      "aws",
      "k8s",
      "postgres",
      "mysql",
      "mongodb",
      "snowflake",
      "databricks",
      "db-database",
      "db-schema",
      "db-table",
      "db-warehouse",
      "db-collection",
      "atlassian-site",
      "jira-project",
      "confluence-page",
      "confluence-space",
      "github-repo",
      "github-org",
      "monday-board",
      "mixpanel",
      "okta",
      "knowledge-collection",
      "apono-target"
    ],
    "oauthMcp": [
      "notion",
      "notion-page",
      "notion-database",
      "slack-channel",
      "linear-issue",
      "asana-task",
      "clickup-task",
      "figma-file",
      "miro-board",
      "hubspot-object",
      "salesforce-object",
      "zendesk-ticket",
      "intercom-conversation",
      "airtable-base",
      "gdrive-file",
      "gmail-mailbox",
      "gcal-calendar",
      "gsheet",
      "box-file",
      "dropbox-file",
      "sentry-project"
    ],
    "roadmap": [
      "azure",
      "gitlab-repo",
      "gitlab-group",
      "jfrog-repo"
    ],
    "unsupported": [
      "gcp",
      "oci",
      "git-remote",
      "web-domain"
    ],
    "labels": {
      "supported": "supported today",
      "oauthMcp": "supported via custom OAuth MCP",
      "roadmap": "on roadmap",
      "unsupported": "not supported",
      "unknown": "needs review"
    },
    "note": "Catalog status as of 2026-08-31: AWS and Kubernetes GA; PostgreSQL, MySQL, MongoDB, Snowflake and Databricks GA; native Atlassian, GitHub, monday.com, Mixpanel and Okta integrations; Azure, GitLab and JFrog Artifactory on the roadmap. Anything marked 'supported via custom OAuth MCP' is reachable through Apono's custom OAuth MCP support, which covers most OAuth MCP servers (unauthenticated, dynamic client registration, and client-ID authentication). This is a PRODUCT FACT THAT CHANGES -- re-check it against the current integration catalog before putting an assessment in front of a customer."
  }
};

// ---------------------------------------------------------------- small fs helpers
const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
const isFile = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };
const MAX_READ_BYTES = 256 * 1024 * 1024;   // larger files are skipped, not truncated
const readText = (p) => {
  try {
    if (fs.statSync(p).size > MAX_READ_BYTES) return null;
    return fs.readFileSync(p, "utf-8");
  } catch { return null; }
};
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return null; } };
/* VS Code's settings.json is JSONC: comments and trailing commas are legal there. */
function readJsonc(p) {
  const direct = readJson(p); if (direct) return direct;
  const txt = readText(p); if (txt === null) return null;
  const stripped = txt
    .replace(/"(?:[^"\\]|\\.)*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) => (m[0] === '"' ? m : " "))
    .replace(/,(\s*[}\]])/g, "$1");
  try { return JSON.parse(stripped); } catch { return null; }
}
/* "mcp.servers" -> cfg.mcp.servers; a plain key still works. */
const jsonAt = (obj, key) =>
  key.split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), obj);
const listDir = (p) => { try { return fs.readdirSync(p); } catch { return []; } };
function* walkFiles(dir, suffix, depth = 0) {
  if (depth > 16) return;                      // defense against pathological nesting
  for (const e of listDir(dir)) {
    const p = path.join(dir, e);
    let st; try { st = fs.lstatSync(p); } catch { continue; }
    if (st.isSymbolicLink()) continue;         // never follow symlinks while walking
    if (st.isDirectory()) yield* walkFiles(p, suffix, depth + 1);
    else if ([].concat(suffix).some((sx) => e.endsWith(sx))) yield p;
  }
}

// ---------------------------------------------------------------- scan profiles
function isWsl() {
  if (process.platform !== "linux") return false;
  if (process.env.WSL_DISTRO_NAME) return true;
  return (readText("/proc/version") || "").toLowerCase().includes("microsoft");
}
function buildProfiles() {
  const profs = [];
  const mk = (label, home, roaming) => ({ label, home, roaming,
    tag: (s) => (label ? `${s} [${label}]` : s) });
  if (process.platform === "darwin") {
    profs.push(mk("", HOME, path.join(HOME, "Library", "Application Support")));
  } else if (process.platform === "win32") {
    profs.push(mk("", HOME, process.env.APPDATA || path.join(HOME, "AppData", "Roaming")));
  } else {
    profs.push(mk("", HOME, path.join(HOME, ".config")));
    const roots = [];
    if (isWsl())
      for (const drive of listDir("/mnt"))
        for (const u of listDir(path.join("/mnt", drive, "Users")))
          roots.push(path.join("/mnt", drive, "Users", u));
    if (process.env.DISCOVERY_WIN_ROOT) roots.push(process.env.DISCOVERY_WIN_ROOT); // test hook
    for (const base of roots) {
      const name = path.basename(base);
      if (["public", "default", "default user", "all users", "desktop.ini"].includes(name.toLowerCase())) continue;
      const roaming = path.join(base, "AppData", "Roaming");
      if (isDir(roaming)) profs.push(mk(`windows-profile:${name}`, base, roaming));
    }
  }
  return profs;
}
const PROFILES = buildProfiles();
/* Called once the salt is known: a Windows profile name is a username, so redact it too. */
function redactProfileLabels() {
  if (!REDACT) return;
  for (const p of PROFILES) {
    const m = /^windows-profile:(.+)$/.exec(p.label);
    if (!m) continue;
    const h = crypto.createHash("sha256")
      .update(`agentic-discovery/machine\u0000${SALT}\u0000${m[1]}`).digest("hex").slice(0, 8);
    p.label = `Windows profile ${h} (via WSL)`;
  }
}

// ---------------------------------------------------------------- classification
const SQL_CATS = R.sqlCats.map(([c, rx]) => [c, new RegExp(rx, "i")]);
function categorize(toolName, args) {
  if (args && typeof args === "object") {
    if (R.verbOrder.includes(args.intent_category)) return args.intent_category;
    for (const k of R.sqlArgKeys) {
      const v = args[k];
      if (typeof v === "string")
        for (const [cat, rx] of SQL_CATS) if (rx.test(v)) return cat;
    }
  }
  const t = (toolName || "").toLowerCase().replace(/[^a-z]/g, " ");
  const words = t.split(/\s+/).filter(Boolean);
  const joined = t.replace(/ /g, "");
  for (const cat of R.verbOrder) {
    const verbs = R.verbs[cat];
    if (words.some((w) => verbs.includes(w)) || verbs.some((v) => joined.startsWith(v))) return cat;
  }
  return "unknown";
}
function planeOf(toolName, rid, rtype) {
  const parts = `${toolName} ${rid} ${rtype}`.toLowerCase().split(/[^a-z]+/);
  return R.controlHints.some((h) => parts.includes(h)) ? "control" : "data";
}
function cliCat(op, extraWrite = []) {
  op = (op || "").toLowerCase();
  if (extraWrite.includes(op)) return "create";
  for (const [cat, prefixes] of Object.entries(R.cliVerbCats))
    if (prefixes.some((p) => op.startsWith(p))) return cat;
  return "unknown";
}

// ---------------------------------------------------------------- data model
const RES = new Map(), MCP = new Map(), AGENTS = new Map();
const STATS = { external: 0, resolved: 0 };
const UNRESOLVED = new Map();   // label -> count, for --unresolved
const TYPE_GROUP = {};
for (const [g, types] of Object.entries(R.resourceGroups)) for (const t of types) TYPE_GROUP[t] = g;
const resGroup = (t) => TYPE_GROUP[t] || "Other";
const isReported = (t) => R.reportGroups.includes(resGroup(t));

function emit(rtype, rid, agent, via, tool, cat, ts) {
  if (!rid) return null;
  rid = String(rid).slice(0, 80);
  const k = `${rtype} ${rid}`;
  const r = RES.get(k) || { rtype, rid, calls: 0, cats: new Set(), planes: new Set(),
                            agents: new Set(), via: new Set(), first: null, last: null };
  RES.set(k, r);
  r.calls++; r.cats.add(cat); r.agents.add(agent); if (via) r.via.add(via);
  r.planes.add(planeOf(tool, rid, rtype));
  if (ts) { if (!r.first || ts < r.first) r.first = ts; if (!r.last || ts > r.last) r.last = ts; }
  return rtype;
}
/* Count one externally-reaching action, given the resource types it resolved to.
   Actions that resolve ONLY to non-reported groups (web browsing, code hosting)
   are left out of both numerator and denominator so the rate stays meaningful. */
function countAction(types, label) {
  if (types.length && !types.some(isReported)) return;
  STATS.external++;
  if (types.some(isReported)) STATS.resolved++;
  else if (label) UNRESOLVED.set(label, (UNRESOLVED.get(label) || 0) + 1);
}
function mcpRec(agent, server) {
  const k = `${agent} ${server}`;
  const r = MCP.get(k) || { agent, server, configured: false, used: 0, last: null,
                            tools: new Set(), source: new Set() };
  MCP.set(k, r); return r;
}
function agentRec(agent) {
  const a = AGENTS.get(agent) || { installed: false, sessions: 0, actions: 0,
                                   first: null, last: null, gaps: [], evidence: new Set() };
  AGENTS.set(agent, a); return a;
}
const addGap = (agent, gap) => { const a = agentRec(agent); if (!a.gaps.includes(gap)) a.gaps.push(gap); };
function noteTs(agent, ts) {
  const a = agentRec(agent);
  if (ts) { if (!a.first || ts < a.first) a.first = ts; if (!a.last || ts > a.last) a.last = ts; }
}

// ---------------------------------------------------------------- arg extraction
function domainOf(url) {
  const m = /^(?:https?:\/\/)?([\w.-]+\.[a-z]{2,})(?::\d+)?(?:\/|$)/.exec(String(url).trim());
  return m ? m[1].toLowerCase().split("@").pop() : null;
}
function walkObj(d, out) {
  if (Array.isArray(d)) for (const v of d) walkObj(v, out);
  else if (d && typeof d === "object")
    for (const [k, v] of Object.entries(d))
      (v && typeof v === "object") ? walkObj(v, out) : out.push([k, v]);
}
/* Argument keys vary by vendor spelling: pageId / page_id / pageid all mean the same thing. */
const normKey = (k) => String(k).toLowerCase().replace(/[_-]/g, "");
const KEY_RULES = R.keyRules.map((r) => ({ ...r,
                                           fromValue: (r.typeFromValue || []).map((v) => ({ ...v, rx: new RegExp(v.match) })),
                                           normKeys: r.keys.map(normKey),
                                           toolRx: r.whenTool ? new RegExp(r.whenTool) : null,
                                           serverRx: r.whenServer ? new RegExp(r.whenServer) : null,
                                           extractRx: r.valueExtract ? new RegExp(r.valueExtract) : null }));
const SERVICE_RULES = (R.serviceRules || []).map((r) => ({ ...r,
                                           rx: r.toolPattern ? new RegExp(r.toolPattern) : null,
                                           serverRx: r.serverPattern ? new RegExp(r.serverPattern) : null }));
const FINGERPRINTS = (R.connectorFingerprints || []).map((f) => ({ ...f, rx: new RegExp(f.toolPattern) }));
const CONNECTOR_NAMES = new Map();

/* Returns the list of resource types emitted (empty = nothing resolved). */
function extractArgs(args, agent, via, tool, cat, ts, server = "") {
  const flat = []; walkObj(args, flat); const types = [];
  for (const [k, v] of flat) {
    if (v === null || v === undefined || v === "") continue;
    const kl = k.toLowerCase(), vs = String(v);
    if (R.jiraIssueKeys.includes(kl)) {
      const m = /^([A-Z][A-Z0-9]+)-\d+/.exec(vs);
      if (m) { const t = emit("jira-project", m[1], agent, via, tool, cat, ts); if (t) types.push(t); continue; }
    }
    const nk = normKey(kl);
    const rule = KEY_RULES.find((r) => (!r.toolRx || r.toolRx.test(tool))
                                    && (!r.serverRx || r.serverRx.test(server))
                                    && r.normKeys.includes(nk));
    if (rule) {
      let val = vs;
      if (rule.extractRx) {                    // e.g. pull a page id out of a full URL
        const m = rule.extractRx.exec(vs);
        if (!m) continue;
        val = m[1];
      }
      if (rule.stripChars) val = val.split(new RegExp(`[${rule.stripChars}]`, "g")).join("");
      // some identifiers name their own vendor -- "snowflake-snowflake-prod" is a Snowflake resource
      const rtype = (rule.fromValue.find((v) => v.rx.test(val)) || {}).type || rule.type;
      const t = emit(rtype, val, agent, via, tool, cat, ts);
      if (t) types.push(t);
      continue;
    }
    if (R.urlKeys.includes(kl)) {
      const dom = domainOf(vs);
      if (dom) { const t = emit("web-domain", dom, agent, via, tool, cat, ts); if (t) types.push(t); }
    }
  }
  return types;
}

// ---------------------------------------------------------------- shell parsing
/* Remove heredoc bodies: their contents are data (scripts, text), not commands run here. */
function stripHeredocs(cmd) {
  const lines = String(cmd).split(/\n/);
  const out = [];
  let delim = null;
  for (const line of lines) {
    if (delim !== null) {
      if (line.trim() === delim) delim = null;
      continue;
    }
    const m = /<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/.exec(line);
    if (m) { out.push(line.slice(0, m.index)); delim = m[2]; continue; }
    out.push(line);
  }
  return out.join("\n");
}
const NESTED_SHELL_RE = new RegExp(R.shellInterpreterRegex);
/* Split into command segments, honouring quotes: a CLI only counts as invoked when it
   sits at a command position. Recurses into real shell -c bodies (which do execute). */
function commandSegments(cmd, depth = 0) {
  const segs = [];
  let cur = "", q = null, i = 0;
  const push = () => { const s = cur.trim(); if (s) segs.push(s); cur = ""; };
  while (i < cmd.length) {
    const ch = cmd[i];
    if (q) {
      cur += ch;
      if (ch === q && cmd[i - 1] !== "\\") q = null;
      i++; continue;
    }
    if (ch === "'" || ch === '"') { q = ch; cur += ch; i++; continue; }
    if (ch === "$" && cmd[i + 1] === "(") { push(); i += 2; continue; }
    if (ch === "(" || ch === ")" || ch === "`" || ch === "\n") { push(); i++; continue; }
    const two = cmd.slice(i, i + 2);
    if (two === "&&" || two === "||" || two === ";;") { push(); i += 2; continue; }
    if (ch === ";" || ch === "|" || ch === "&") { push(); i++; continue; }
    cur += ch; i++;
  }
  push();
  const out = [];
  for (const s of segs) {
    out.push(s);
    if (depth < R.maxNestedShellDepth) {
      const m = NESTED_SHELL_RE.exec(s);
      if (m) out.push(...commandSegments(m[2], depth + 1));
    }
  }
  return out;
}
/* "CLI: aws", "MCP: server > tool" -- tool type plus the tool itself. */
const viaStr = (type, detail) => `${R.viaLabels[type] || type}: ${detail}`;
const PREFIX_SKIP = new Set(R.commandPrefixSkip);
function firstToken(seg) {
  for (const tok of seg.split(/\s+/)) {
    if (!tok) continue;
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tok)) continue;   // VAR=value prefix
    const base = tok.replace(/^.*\//, "").replace(/^["']/, "");
    if (PREFIX_SKIP.has(base)) continue;
    return base;
  }
  return "";
}
function sqlPayload(seg) {
  const m = /(?:-c|-e|--command|--execute)\s*=?\s*(['"])([\s\S]*?)\1/.exec(seg);
  if (m) return m[2];
  const h = /<<<\s*(['"]?)([\s\S]*?)\1\s*$/.exec(seg);
  return h ? h[2] : null;
}
const SHELL_RULES = R.shellRules.map((r) => ({ ...r, rx: new RegExp(r.regex, "g") }));
function ridFromTemplate(tpl, m) {
  for (const alt of tpl.split("||")) {
    let ok = true;
    const s = alt.replace(/\$(\d+)/g, (_, n) => { const v = m[+n]; if (!v) ok = false; return v || ""; });
    if (ok && s) return s;
  }
  return null;
}
function handleShell(cmd, agent, ts) {
  const types = [];
  for (const seg of commandSegments(stripHeredocs(cmd || ""))) {
    const bin = firstToken(seg);
    if (!bin) continue;
    for (const rule of SHELL_RULES) {
      if (rule.bin !== bin) continue;
      rule.rx.lastIndex = 0;
      for (const m of seg.matchAll(rule.rx)) {
        let rtype, rid, cat;
        if (rule.kind === "cloud") {
          rtype = rule.type; rid = ridFromTemplate(rule.rid, m);
          const verb = (rule.verbGroups || []).map((g) => m[g]).find(Boolean) || rule.verbDefault;
          cat = verb ? cliCat(verb, rule.extraWrite || []) : "unknown";
          if (rule.sqlFromSegment) {
            // classify DB access from the SQL passed in the same command segment
            const sql = sqlPayload(seg);
            if (sql) for (const [c, rx] of SQL_CATS) if (rx.test(sql)) { cat = c; break; }
          }
        } else if (rule.kind === "gitremote") {
          rtype = "git-remote";
          rid = domainOf(m[2].replace("git@", "https://").replace(".com:", ".com/"));
          cat = m[1] === "push" ? "update" : "read";
        } else if (rule.kind === "curl") {
          rtype = "web-domain"; rid = domainOf(m[2]);
          const meth = (/-X\s*(\w+)/i.exec(m[1] || "") || [null, "get"])[1].toLowerCase();
          cat = { post: "create", put: "update", patch: "update", delete: "delete" }[meth] || "read";
        } else continue;
        if (rid) { const t = emit(rtype, rid, agent, viaStr("cli", rule.via), "shell", cat, ts); if (t) types.push(t); }
      }
    }
  }
  if (types.length) countAction(types);
}

// ---------------------------------------------------------------- tool handling
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WRAPPER_RE = new RegExp(R.gatewayWrapperRegex);
function handleTool(agent, name, args, ts) {
  agentRec(agent).actions++; noteTs(agent, ts);
  const lname = (name || "").toLowerCase();
  if (R.shellToolNames.includes(lname) || lname.endsWith("__bash"))
    return handleShell((args && (args.command || args.cmd)) || "", agent, ts);
  if (R.webFetchToolNames.includes(lname)) {
    const dom = domainOf((args && args.url) || "");
    const types = [];
    if (dom) { const t = emit("web-domain", dom, agent, viaStr("builtin", name), name, "read", ts); if (t) types.push(t); }
    countAction(types, `builtin: ${name}`);
    return;
  }
  let server = null, tool = null;
  if (name && name.startsWith("mcp__")) {
    const p = name.split("__"); server = p[1]; tool = p.slice(2).join("__") || "?";
  } else if (name && name.includes(".") && !name.startsWith("_")) {
    const i = name.indexOf("."); server = name.slice(0, i); tool = name.slice(i + 1);
  }
  if (!server) return; // built-in / local tool
  const sl = server.toLowerCase();
  let base = server;
  if (UUID_RE.test(server)) {
    if (!CONNECTOR_NAMES.has(server)) {
      const fp = FINGERPRINTS.find((f) => f.rx.test(tool));
      if (fp) CONNECTOR_NAMES.set(server, `${fp.name} (claude.ai connector)`);
    }
    base = CONNECTOR_NAMES.get(server) || `connector:${server.slice(0, 8)}... (unidentified)`;
  }
  const label = base + (R.infraServers.includes(sl) ? " (session tooling)" : "");
  const rec = mcpRec(agent, label);
  rec.used++; rec.tools.add(tool.slice(0, 40));
  if (ts && (!rec.last || ts > rec.last)) rec.last = ts;
  if (R.infraServers.includes(sl)) {
    if (tool === "bash") handleShell((args && args.command) || "", agent, ts);
    else if (tool === "web_fetch") {
      const dom = domainOf((args && args.url) || "");
      const types = [];
      if (dom) { const t = emit("web-domain", dom, agent, viaStr("builtin", `${server} > ${tool}`), tool, "read", ts); if (t) types.push(t); }
      countAction(types, `${server} > ${tool}`);
    }
    return;
  }
  if (R.browserServers.includes(sl)) {
    const flat = []; walkObj(args || {}, flat); const types = [];
    for (const [k, v] of flat)
      if (k === "url" && domainOf(v)) {
        const t = emit("web-domain", domainOf(v), agent, viaStr("browser", `${server} > ${tool}`), tool, "read", ts);
        if (t) types.push(t);
      }
    countAction(types, `${server} > ${tool}`);
    return;
  }
  const isControl = (t) => R.gatewayControlTools.some((c) => t === c || t.endsWith(c));
  if (R.gatewayAliases.includes(sl) && isControl(tool)) return;
  let cat = categorize(tool, args && typeof args === "object" ? args : {});
  let innerTool = tool;
  if (args && typeof args === "object" && "tool_name" in args) { // gateway-style wrapper
    const m = WRAPPER_RE.exec(String(args.tool_name || ""));
    if (m) {
      innerTool = m[1];
      if (R.gatewayAliases.includes(sl) && isControl(innerTool)) return;   // control plane, wrapped
      let raw = args.arguments;
      if (typeof raw === "string") {
        try { raw = JSON.parse(raw); }
        catch { try { raw = JSON.parse(raw.replace(/'/g, '"')); } catch { /* keep as-is */ } }
      }
      const innerCat = categorize(innerTool, raw && typeof raw === "object" ? raw : {});
      if (innerCat !== "unknown") cat = innerCat;
      if (raw && typeof raw === "object") {
        const types = extractArgs(raw, agent, viaStr("mcp", `${label} > ${innerTool}`).slice(0, 70), innerTool, cat, ts, server);
        if (types.length) { countAction(types, `${label} > ${innerTool}`); return; }
      }
    }
  }
  const via = viaStr("mcp", `${label} > ${innerTool}`).slice(0, 70);
  const types = (args && typeof args === "object")
    ? extractArgs(args, agent, via, innerTool, cat, ts, server)
    : [];
  if (!types.length) {                 // reached a known service, named no specific resource
    const sr = SERVICE_RULES.find((r) => (r.rx && r.rx.test(innerTool))
                                      || (r.serverRx && r.serverRx.test(server)));
    if (sr) { const t = emit(sr.type, sr.rid, agent, via, innerTool, cat, ts); if (t) types.push(t); }
  }
  countAction(types, `${label} > ${innerTool}`);
}

// ---------------------------------------------------------------- host scanning (generic)
/* Adding a platform is normally a rules.json edit: declare its presence checks, MCP config
   files and transcript sources. Code is only needed for a genuinely new log FORMAT, which
   means one new entry in the PARSERS registry below. */

const rootOf = (prof, root) => (root === "roaming" ? prof.roaming : prof.home);
const srcPath = (prof, src) => path.join(rootOf(prof, src.root), ...src.path);
/* Expand a path whose segments may contain "*" into every matching concrete path. */
function expandPath(base, parts) {
  let cur = [base];
  for (const seg of parts) {
    const next = [];
    for (const c of cur) {
      if (seg === "*") for (const e of listDir(c)) next.push(path.join(c, e));
      else next.push(path.join(c, seg));
    }
    cur = next;
  }
  return cur;
}

/* VS Code writes epoch milliseconds; other shapes are left alone. */
const vscodeTs = (v) => {
  if (typeof v === "number" && v > 1e12) return new Date(v).toISOString();
  if (typeof v === "string" && /^\d{4}-\d\d-\d\d/.test(v)) return v;
  return null;
};
/* VS Code names an MCP tool "mcp_<server>_<tool>"; the rest of this file expects
   "mcp__<server>__<tool>". Server names may contain underscores, so this splits on the
   first separator and accepts that an unusual name may attribute imperfectly. */
const vscodeToolName = (raw) => {
  const m = /^mcp_(.+?)_(.+)$/.exec(raw);
  return m ? `mcp__${m[1]}__${m[2]}` : raw;
};
/* Terminal tools differ by name across builds; the command itself is what matters. */
const VSCODE_TERMINALISH = /terminal|runcommand|run_in_terminal|runinterminal|shell|^exec$/i;
const VSCODE_CMD_KEYS = ["command", "cmd", "commandLine", "terminalCommand"];
/* Emit one invocation, routing a terminal command through the shell analysis so a
   VS Code agent running "kubectl get pods" is treated like any other CLI access. */
function emitVscodeTool(name, args, emit) {
  const cmd = VSCODE_CMD_KEYS.map((k) => {
    const v = args[k];
    if (typeof v === "string") return v;
    if (v && typeof v === "object") return v.original || v.toolEdited || v.command;
    return null;
  }).find((c) => typeof c === "string" && c);
  if (cmd && VSCODE_TERMINALISH.test(name)) emit("bash", { command: cmd });
  else emit(vscodeToolName(name), args);
}
const asObject = (a) => {
  if (typeof a === "string") { try { a = JSON.parse(a); } catch { return {}; } }
  return a && typeof a === "object" ? a : {};
};
/* Walk a chat request for tool invocations. The shape moves between VS Code versions, so
   two known carriers are handled: a toolCalls array (current -- reached via
   result.metadata.toolCallRounds) and a toolId/toolName object (serialized response parts in
   other builds). Nothing else is treated as a call: model text that merely contains
   tool-call syntax is not evidence a tool ran, and inventing access is the one error worth
   avoiding above all others. */
function walkVscodeTools(node, emit, depth = 0) {
  if (!node || typeof node !== "object" || depth > 14) return;
  if (Array.isArray(node)) { for (const v of node) walkVscodeTools(v, emit, depth + 1); return; }
  if (Array.isArray(node.toolCalls)) {
    for (const tc of node.toolCalls) {
      if (!tc || typeof tc !== "object") continue;
      const fn = tc.function && typeof tc.function === "object" ? tc.function : {};
      const nm = [tc.name, tc.toolName, tc.toolId, fn.name]
        .find((x) => typeof x === "string" && x);
      if (!nm) continue;
      const raw = [tc.arguments, tc.input, tc.rawInput, tc.parameters, fn.arguments]
        .find((a) => a !== undefined);
      emitVscodeTool(nm, asObject(raw), emit);
    }
  }
  const id = typeof node.toolId === "string" ? node.toolId
           : typeof node.toolName === "string" ? node.toolName : null;
  if (id) {
    const sd = asObject(node.toolSpecificData);
    const args = [sd.rawInput, sd.input, node.rawInput, node.input, node.arguments, node.parameters]
      .find((a) => a && typeof a === "object");
    emitVscodeTool(id, args || sd, emit);
  }
  for (const v of Object.values(node)) walkVscodeTools(v, emit, depth + 1);
}

const PARSERS = {
  /* Claude Code / Claude Desktop agent mode: JSONL, assistant messages with tool_use blocks. */
  claudeStream(file, agent) {
    agentRec(agent).sessions++;
    const txt = readText(file); if (txt === null) return;
    for (const line of txt.split(/\r?\n/)) {
      let d; try { d = JSON.parse(line); } catch { continue; }
      if (!d || d.type !== "assistant" || typeof d.message !== "object" || !d.message) continue;
      for (const c of d.message.content || [])
        if (c && c.type === "tool_use")
          handleTool(agent, c.name || "", c.input || {}, d.timestamp || d._audit_timestamp);
    }
  },
  /* Codex: JSONL rollout files, response_item payloads of type function_call. */
  codexStream(file, agent) {
    agentRec(agent).sessions++;
    const txt = readText(file); if (txt === null) return;
    for (const line of txt.split(/\r?\n/)) {
      let d; try { d = JSON.parse(line); } catch { continue; }
      const p = (d && d.payload) || {};
      if (d && d.type === "response_item" && p.type === "function_call") {
        let args; try { args = JSON.parse(p.arguments || "{}"); } catch { args = {}; }
        handleTool(agent, p.name || "", args, d.timestamp);
      }
    }
  },
  /* VS Code chat / agent sessions. The files are .jsonl: each line is a {kind, v} envelope
     -- kind 0 carries a session snapshot whose v.requests holds the turns, later kinds carry
     arrays of turns. Tool calls sit under each turn at result.metadata.toolCallRounds. */
  vscodeChatSessions(file, agent) {
    agentRec(agent).sessions++;
    const txt = readText(file); if (txt === null) return;
    let sessionTs = null;
    for (const line of txt.split(/\r?\n/)) {
      if (!line.trim()) continue;
      let rec; try { rec = JSON.parse(line); } catch { continue; }
      const v = rec && rec.v !== undefined ? rec.v : rec;
      if (!v || typeof v !== "object") continue;
      sessionTs = sessionTs || vscodeTs(v.creationDate);
      const turns = Array.isArray(v) ? v
                  : Array.isArray(v.requests) ? v.requests
                  : [v];
      for (const t of turns) {
        const ts = vscodeTs(t && (t.timestamp || t.responseTimestamp)) || sessionTs;
        walkVscodeTools(t, (name, args) => handleTool(agent, name, args, ts));
      }
    }
  },
  /* VS Code-family editors (Cursor et al.): conversations in a SQLite key/value store.
     Counts conversations only -- these stores do not expose tool calls in a stable shape. */
  async vscodeSqliteSessions(file, agent, src, host) {
    const a = agentRec(agent);
    try {
      const { DatabaseSync } = await import("node:sqlite");
      const con = new DatabaseSync(file, { readOnly: true });
      try {
        const rows = con.prepare(src.sql).all();
        if (src.countRows) a.sessions += rows.length;
        else for (const row of rows) {
          try {
            const j = JSON.parse(row.value);
            const conv = j[src.conversationKey];
            if (conv && Object.keys(conv).length) a.sessions++;
          } catch { /* skip malformed row */ }
        }
      } catch { /* table absent on this version -- not an error */ }
      con.close();
    } catch {
      if (host.gapStore) addGap(agent, host.gapStore);
    }
  },
};

function scanPresence(host, prof) {
  const a = agentRec(host.name);
  for (const src of host.presence || []) {
    const p = srcPath(prof, src);
    const found = src.childPrefix ? listDir(p).some((e) => e.startsWith(src.childPrefix))
                                  : fs.existsSync(p);
    if (found) { a.installed = true; a.evidence.add(prof.tag(src.evidence)); }
  }
}
function addServers(hostName, entries, prof, label, disabledKey) {
  for (const [name, entry] of Object.entries(entries || {})) {
    const off = disabledKey && entry && entry[disabledKey] === true;
    const r = mcpRec(hostName, name + (off ? " (disabled in config)" : ""));
    r.configured = true; r.source.add(prof.tag(label));
  }
}
const asEntries = (names) => Object.fromEntries(names.map((n) => [n, {}]));
function scanMcpConfigs(host, prof) {
  for (const src of host.mcpConfigs || []) {
    const p = srcPath(prof, src);
    if (src.tomlSectionRegex) {                       // Codex-style TOML sections
      const rx = new RegExp(src.tomlSectionRegex, "gm");
      const names = [...(readText(p) || "").matchAll(rx)].map((m) => m[1]);
      addServers(host.name, asEntries(names), prof, src.label);
      continue;
    }
    if (src.nameKeys) {                               // per-server metadata files, path may glob
      for (const f of expandPath(rootOf(prof, src.root), src.path)) {
        const j = readJson(f); if (!j) continue;
        const name = src.nameKeys.map((k) => j[k]).find(Boolean);
        if (name) addServers(host.name, asEntries([name]), prof, src.label);
      }
      continue;
    }
    if (src.manifestDir) {                            // a directory of extension manifests
      for (const e of listDir(p)) {
        const mf = readJson(path.join(p, e, "manifest.json"));
        if (mf) addServers(host.name, asEntries([mf.name || e]), prof, src.label);
      }
      continue;
    }
    const cfg = src.jsonc ? readJsonc(p) : readJson(p);
    if (!cfg) continue;
    if (src.expandProjects) {                         // per-project blocks + their own file
      const ex = src.expandProjects;
      for (const [proj, pc] of Object.entries(cfg[ex.key] || {})) {
        for (const key of src.jsonKeys)
          addServers(host.name, (pc && pc[key]) || {}, prof, src.label, src.disabledFlagKey);
        const child = readJson(path.join(proj, ex.childFile));
        for (const key of src.jsonKeys)
          addServers(host.name, (child && child[key]) || {}, prof, ex.childLabel, src.disabledFlagKey);
      }
      continue;
    }
    for (const key of src.jsonKeys || []) {           // first key that exists wins; may be dotted
      const entries = jsonAt(cfg, key) || {};
      if (Object.keys(entries).length) {
        addServers(host.name, entries, prof, src.label, src.disabledFlagKey);
        break;
      }
    }
  }
}
async function scanTranscripts(host, prof) {
  for (const src of host.transcripts || []) {
    const parser = PARSERS[src.parser];
    if (!parser) continue;
    const p = srcPath(prof, src);
    if (src.suffix) {
      for (const f of walkFiles(p, src.suffix)) {
        // case-insensitive: VS Code has both chatSessions and emptyWindowChatSessions
        if (src.mustContain && !f.toLowerCase().includes(src.mustContain.toLowerCase())) continue;
        await parser(f, host.name, src, host);
      }
    } else if (isFile(p)) {
      await parser(p, host.name, src, host);
    }
  }
}
async function scanHost(host, prof) {
  scanPresence(host, prof);
  scanMcpConfigs(host, prof);
  await scanTranscripts(host, prof);
  const a = agentRec(host.name);
  if (a.installed && host.gap) addGap(host.name, host.gap);
}

// ---------------------------------------------------------------- memory & instruction files
/* Agent memory and instruction files name the resources an agent has been told about or has
   remembered. That is a DIFFERENT signal from access: reported separately, never merged. */
const MEM = new Map();
const MEMORY = R.memoryScan || {};
const MEM_PATTERNS = (MEMORY.patterns || []).map((p) => ({ ...p, rx: new RegExp(p.regex, "gm") }));

function memEmit(rtype, rid, file) {
  if (!rid) return;
  const k = `${rtype} ${rid}`;
  const m = MEM.get(k) || { rtype, rid, mentions: 0, files: new Set() };
  MEM.set(k, m);
  m.mentions++; m.files.add(file);
}
function scanMemoryText(text, label) {
  for (const p of MEM_PATTERNS) {
    p.rx.lastIndex = 0;
    for (const m of text.matchAll(p.rx)) memEmit(p.type, m[p.group], label);
  }
}
function scanMemory(prof) {
  if (MEMORY.enabled !== true) return;
  for (const src of MEMORY.sources || []) {
    if (src.fromClaudeProjects) {                 // project-level instruction files
      const cfg = readJson(path.join(prof.home, ".claude.json"));
      for (const proj of Object.keys((cfg && cfg.projects) || {}))
        for (const name of src.fromClaudeProjects) {
          const txt = readText(path.join(proj, name));
          if (txt) scanMemoryText(txt, prof.tag(src.label));
        }
      continue;
    }
    for (const p of expandPath(rootOf(prof, src.root), src.path)) {
      if (src.suffix) {
        for (const f of walkFiles(p, src.suffix)) {
          const txt = readText(f);
          if (txt) scanMemoryText(txt, prof.tag(src.label));
        }
      } else {
        const txt = readText(p);
        if (txt) scanMemoryText(txt, prof.tag(src.label));
      }
    }
  }
}

// ---------------------------------------------------------------- redaction
/* Resource names can be sensitive. When redaction is on we publish the TYPE in full and
   reduce the NAME to its last few characters, plus a short one-way tag.

   The tag matters for two reasons: distinct resources must stay distinct rows (two names can
   share their last 4 characters), and the same resource must redact identically on every
   machine so per-machine reports still consolidate. Both hold because the tag is a
   deterministic hash of the full name.

   Names too short to reveal safely are masked completely and identified by the tag alone --
   showing "the last 4" of a 3-character name would show all of it.

   Pass --salt <secret> to make tags unguessable (without a salt a short name could be found by
   hashing candidates). Use the SAME salt for every machine in one assessment, and never put the
   salt in the shared report. */
const RD = R.redaction || {};
let REDACT = RD.enabled === true;
let SALT = "";
let SALT_BASIS = "";   // how the salt was obtained, for the report header

/* Default salt: the organization's email domain. It makes every machine in one organization
   redact identically (so per-machine reports consolidate) without anyone distributing a secret.
   It is NOT a secret -- a domain is public and guessable, so short names remain brute-forceable.
   Pass --salt <secret> when the assessment needs tags that cannot be guessed. */
function findEmailDomain(prof) {
  for (const src of (RD.defaultSalt && RD.defaultSalt.sources) || []) {
    let email = null;
    if (src.env) {
      for (const v of src.env) if (process.env[v]) { email = process.env[v]; break; }
    } else if (src.jsonPath) {
      let node = readJson(path.join(rootOf(prof, src.root), ...src.path));
      for (const key of src.jsonPath) node = node && node[key];
      if (typeof node === "string") email = node;
    } else if (src.regex) {
      const m = new RegExp(src.regex).exec(readText(path.join(rootOf(prof, src.root), ...src.path)) || "");
      if (m) email = m[1];
    }
    if (email && email.includes("@")) return email.split("@").pop().trim().toLowerCase();
  }
  return null;
}
const tagOf = (s) => crypto.createHash("sha256").update(`${SALT}\u0000${s}`).digest("hex")
                           .slice(0, RD.tagLength || 4);
/* Identifies which salt produced this report's tags, without revealing the salt. Reports can
   only be merged with each other when these match. */
const saltFingerprint = () => crypto.createHash("sha256")
  .update(`agentic-discovery/salt-fingerprint\u0000${SALT}`).digest("hex")
  .slice(0, (RD.saltFingerprint && RD.saltFingerprint.length) || 8);
/* A hostname is usually "<person>-<model>", so the person's name sits in the first segment.
   Masking that segment while keeping its first and last letter leaves a label a colleague can
   recognise at a glance -- n___s~b0f-macbook-pro -- without the name being written down.

   The short tag is not decoration. First letter plus last letter gives 676 combinations, so by the
   birthday bound two machines out of fifty collide about 85% of the time; the tag, hashed from the
   full hostname and the shared salt, makes a genuine collision negligible while leaving the
   readable part untouched. It is deterministic, so a machine keeps its label across re-runs and
   across the reports being merged, and salted, so labels cannot be matched between engagements.

   The label is lower-cased so the same machine cannot produce two spellings, and the mask is a
   fixed width so the name's length is not disclosed either.

   Pseudonymous, not anonymous: with a small team, first letter plus last letter plus model narrows
   it to a person. That is the trade for a label people can act on. --no-redact keeps the hostname. */
function machineLabel() {
  const host = os.hostname().split(".")[0];
  if (!REDACT) return host;
  const cfg = RD.machineLabel || {};
  const mask = cfg.mask || "___";
  const i = host.indexOf("-");
  const person = i === -1 ? host : host.slice(0, i);
  const rest = (i === -1 ? "" : host.slice(i)).toLowerCase();
  // DESKTOP-A1B2C3 and the like carry no name -- masking them hides nothing and costs legibility.
  if ((cfg.genericPrefixes || []).includes(person.toLowerCase())) return host.toLowerCase();
  const p = person.toLowerCase();
  const masked = p.length >= 3 ? p[0] + mask + p[p.length - 1] : mask;
  const tag = crypto.createHash("sha256")
    .update(`agentic-discovery/machine\u0000${SALT}\u0000${host.toLowerCase()}`)
    .digest("hex").slice(0, cfg.tagLength || 3);
  return `${masked}~${tag}${rest}`;
}
function redactRid(rid) {
  if (!REDACT) return rid;
  const pfx = (RD.preservePrefixes || []).find((p) => rid.startsWith(p)) || "";
  const body = rid.slice(pfx.length);
  const mask = RD.mask || "\u00b7\u00b7\u00b7\u00b7";
  const shown = body.length >= (RD.minLengthForReveal || 8)
    ? mask + body.slice(-(RD.keepLast || 4))
    : mask;
  return `${pfx}${shown} #${tagOf(rid)}`;
}

// ---------------------------------------------------------------- report
/* Everything rendered into the report may originate from agent history, which prompt-injected
   content can shape. Neutralise Markdown structure so planted names cannot forge rows, fake
   sections, or "all clear" verdicts in the report a security reviewer trusts. */
function mdSafe(v) {
  return String(v)
    .replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, " ")  // newlines & control chars
    .replace(/\|/g, "\u00a6")                                 // table-cell separator
    .replace(/`/g, "'")                                        // code-span escape
    .replace(/^[#>+*-]\s/, "\u00b7 ");                              // line-leading structure
}
const fmtTs = (ts) => (ts ? String(ts).slice(0, 10) : "-");
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
function accessSummary(cats) {
  const c = new Set([...cats].filter((x) => x !== "unknown"));
  if (!c.size) return "unclassified";
  if (c.size === 1 && c.has("read")) return "read-only";
  if (c.has("admin")) return "includes ADMIN";
  if (c.has("delete")) return "includes DELETE";
  if (c.has("create") || c.has("update")) return c.has("read") ? "read+write" : "write";
  return [...c].sort().join("+");
}
function viaList(via) {
  const items = [...via].sort();
  const max = R.maxViaPerResource;
  if (items.length <= max) return items.join("; ") || "-";
  return items.slice(0, max).join("; ") + `; +${items.length - max} more`;
}
function platformLine() {
  if (process.platform === "darwin") return "macOS";
  if (process.platform === "win32") return "Windows";
  if (isWsl()) {
    const sides = PROFILES.filter((p) => p.label).map((p) => p.label);
    return "WSL (Linux side" + (sides.length ? ` + ${sides.length} Windows profile(s): ${sides.join("; ")}` : "") + ")";
  }
  return "Linux";
}
function buildReport() {
  const now = new Date().toISOString().slice(0, 16).replace("T", " ");
  const host = machineLabel();
  const L = []; const add = (s) => L.push(s);
  const reported = [...RES.values()].filter((r) => isReported(r.rtype));
  const usedAgents = [...AGENTS.values()].filter((a) => a.actions).length;
  const writes = reported.filter((r) =>
    ["create", "update", "delete", "admin"].some((c) => r.cats.has(c))).length;
  const nMcpUsed = [...MCP.values()].filter((r) => r.used).length;
  add(`# Agentic Access Report -- ${host}`); add("");
  add(`*Generated ${now} on ${platformLine()} | agentic-discovery v${VERSION} (js) | read-only scan | nothing was transmitted*`);
  if (REDACT)
    add(`*Resource names are redacted (${SALT_BASIS || "unsalted"} \u00b7 salt fingerprint ` +
        `${saltFingerprint()}) -- types, tools, access types and counts are exact; names are not. ` +
        `Reports can only be consolidated with each other when this fingerprint matches.*`);
  add("");
  add("## Summary"); add("");
  add(`On this machine, **${usedAgents} agent app(s)** show real activity. Their agents used ` +
      `**${nMcpUsed} MCP server(s)** and reached **${reported.length} corporate resources** ` +
      `(cloud, databases, SaaS); **${writes} of those received updates or privileged actions** ` +
      `(create / update / delete / admin).`);
  if (STATS.external)
    add(`Resource identification rate: ${STATS.resolved}/${STATS.external} externally-reaching ` +
        `actions (${Math.floor((100 * STATS.resolved) / STATS.external)}%).`);
  add(""); add("## Agent apps on this machine"); add("");
  add("| Agent | Present | Activity found | Sessions | Activity window | Found at |");
  add("|---|---|---|---|---|---|");
  for (const name of R.hosts.map((h) => h.name)) {
    const a = AGENTS.get(name) || {};
    const act = a.actions ? `${a.actions} actions` : a.sessions ? "conversations only" : "none found";
    const win = a.first ? `${fmtTs(a.first)} to ${fmtTs(a.last)}` : "-";
    const ev = [...(a.evidence || [])].sort().map(mdSafe).join(", ") || "-";
    add(`| ${mdSafe(name)} | ${a.installed ? "yes" : "no"} | ${act} | ${a.sessions || "-"} | ${win} | ${ev} |`);
  }
  add(""); add("## MCP servers -- installed vs. actually used"); add("");
  add("| Agent | MCP server | Installed (configured) | Actually used | Calls | Last used |");
  add("|---|---|---|---|---|---|");
  const mcpRows = [...MCP.values()].sort((x, y) => y.used - x.used || cmp(x.agent, y.agent)
                                                   || cmp(x.server, y.server));
  for (const r of mcpRows)
    add(`| ${mdSafe(r.agent)} | ${mdSafe(r.server)} | ${r.configured ? "yes (" + [...r.source].sort().map(mdSafe).join(", ") + ")" : "no (seen in history only)"} ` +
        `| ${r.used ? "yes" : "NO -- configured but never used"} | ${r.used || "-"} | ${fmtTs(r.last)} |`);
  if (!mcpRows.length) add("| - | - | - | - | - | - |");
  add(""); add("## Resources accessed"); add("");
  const groups = new Map();
  for (const r of reported) {
    const g = resGroup(r.rtype);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(r);
  }
  let any = false;
  for (const gname of R.reportGroups) {
    const rows = groups.get(gname); if (!rows) continue;
    any = true;
    rows.sort((x, y) => y.calls - x.calls || cmp(x.rid, y.rid));
    add(`### ${gname}`); add("");
    add("| Resource | Type | Access | Intent categories | Tool type & tool used | Agent(s) | Calls | Last seen |");
    add("|---|---|---|---|---|---|---|---|");
    const limit = (R.rowLimits[gname] !== undefined ? R.rowLimits[gname] : R.rowLimits.default) || rows.length;
    for (const r of rows.slice(0, limit)) {
      const cats = [...r.cats].filter((c) => c !== "unknown").sort().join(", ") || "unclassified";
      add(`| \`${mdSafe(redactRid(r.rid))}\` | ${mdSafe(r.rtype)} | **${accessSummary(r.cats)}** | ${cats} | ${mdSafe(viaList(r.via))} ` +
          `| ${[...r.agents].sort().map(mdSafe).join(", ")} | ${r.calls} | ${fmtTs(r.last)} |`);
    }
    if (rows.length > limit) add(`| ...and ${rows.length - limit} more | | | | | | | |`);
    add("");
  }
  if (!any) { add("No corporate resource access was identified on this machine."); add(""); }
  const memRows = [...MEM.values()].filter((m) => isReported(m.rtype));
  if (memRows.length) {
    add("## Resources named in agent memory & instructions"); add("");
    add("*Referenced by the agent's memory or instruction files -- not proof of access.*"); add("");
    add("| Resource | Type | Mentions | Named in | Also accessed? |");
    add("|---|---|---|---|---|");
    memRows.sort((x, y) => y.mentions - x.mentions || cmp(x.rid, y.rid));
    const limit = R.rowLimits.default || memRows.length;
    for (const m of memRows.slice(0, limit)) {
      const accessed = RES.has(`${m.rtype} ${m.rid}`) ? "yes" : "not seen in access history";
      add(`| \`${mdSafe(redactRid(m.rid))}\` | ${mdSafe(m.rtype)} | ${m.mentions} | ${[...m.files].sort().map(mdSafe).join(", ")} | ${accessed} |`);
    }
    if (memRows.length > limit) add(`| ...and ${memRows.length - limit} more | | | | |`);
    add("");
  }
  if (UNRESOLVED.size) {
    const rows = [...UNRESOLVED.entries()].sort((a, b) => b[1] - a[1] || cmp(a[0], b[0]));
    const tot = rows.reduce((n, [, c]) => n + c, 0);
    add("## Actions that reached outside but named no resource"); add("");
    add(`*${tot} actions reached something external without naming a resource this scan could ` +
        `identify. They are real access, so every count above understates rather than overstates. ` +
        `Some of these tools carry no resource identifier at all (browser click-and-type ` +
        `automation, where the page is tab state rather than an argument); others name their ` +
        `target in a way this version does not yet read. Listing them is how the next version ` +
        `learns -- the top rows are worth reporting back to Apono.*`); add("");
    add("| Tool | Actions | Share of unidentified |");
    add("|---|---|---|");
    const limit = R.rowLimits.default || rows.length;
    for (const [lbl, c] of rows.slice(0, limit))
      add(`| ${mdSafe(lbl)} | ${c} | ${((c / tot) * 100).toFixed(1)}% |`);
    if (rows.length > limit) add(`| ...and ${rows.length - limit} more | | |`);
    add("");
  }
  add("## Coverage notes & known gaps"); add("");
  for (const [name, a] of AGENTS) for (const g of a.gaps) add(`- **${name}:** ${g}`);
  for (const g of R.genericGaps) add(`- ${g}`);
  if (MEM.size && MEMORY.note) add(`- ${MEMORY.note}`);
  if (REDACT && RD.note)
    add(`- ${RD.note.replace("{keepLast}", String(RD.keepLast || 4))}`);
  if (REDACT && SALT_BASIS === "organization domain" && RD.defaultSalt && RD.defaultSalt.note)
    add(`- ${RD.defaultSalt.note}`);
  const notReported = Object.keys(R.resourceGroups).filter((g) => !R.reportGroups.includes(g));
  if (notReported.length)
    add(`- Collected but not reported here, by configuration: ${notReported.join(", ")}.`);
  if (isWsl())
    add("- This WSL scan covered the Linux filesystem and the Windows user profiles listed above. " +
        "A Windows-side scan cannot see other WSL distros; run the tool inside each distro that has agent activity.");
  if (process.platform === "win32")
    add("- This Windows scan does not see inside WSL distros. If agents run in WSL (e.g. Claude Code), " +
        "run the same tool inside WSL too.");
  add(""); add("## What this report does and does not contain"); add("");
  add("- Contains: resource identifiers, tool/MCP/agent names, action categories, timestamps, counts.");
  add("- Does NOT contain: prompts, conversation content, shell command text, tool arguments, " +
      "file contents, secrets, or personal data.");
  add("- This scan was read-only and made no network connections. Sharing this file is your choice.");
  add("");
  return L.join("\n");
}

/* Refuse to write through a pre-existing symlink (it would clobber whatever it points at);
   replace the path itself and create the file fresh. */
function writeReport(p, data) {
  try { if (fs.lstatSync(p).isSymbolicLink() || fs.lstatSync(p).isFile()) fs.rmSync(p); } catch { /* absent */ }
  fs.writeFileSync(p, data, { encoding: "utf-8", flag: "wx" });
}

// ---------------------------------------------------------------- main
async function main() {
  const argv = process.argv.slice(2);
  const outDir = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : ".";
  if (argv.includes("--redact")) REDACT = true;
  if (argv.includes("--no-redact")) REDACT = false;
  if (argv.includes("--salt")) SALT = argv[argv.indexOf("--salt") + 1] || "";
  console.log(`Agentic Access Discovery v${VERSION} (js) on ${platformLine()}`);
  if (REDACT && !SALT) {
    const dom = findEmailDomain(PROFILES[0]);
    if (dom) { SALT = dom; SALT_BASIS = "organization domain"; }
  } else if (REDACT && SALT) SALT_BASIS = "explicit salt";
  redactProfileLabels();
  console.log(REDACT
    ? `Resource names will be REDACTED (${SALT_BASIS || "no salt found -- pass --salt for consistent, unguessable tags"}).`
    : "Resource names will be shown in FULL (--no-redact). Do not share this copy unless you intend to.");
  console.log("Read-only scan, no network. Scanning...");
  for (const prof of PROFILES) {
    try { scanMemory(prof); }
    catch (e) { console.log(`  note: memory scan skipped for ${prof.label || "local"} (${e.constructor.name})`); }
    for (const host of R.hosts) {
      try { await scanHost(host, prof); }
      catch (e) { console.log(`  note: ${host.name} skipped for ${prof.label || "local"} (${e.constructor.name})`); }
    }
  }
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const base = path.join(outDir, `agentic-access-report-${machineLabel()}-${stamp}`);
  writeReport(base + ".md", buildReport());
  console.log(`\nThis machine is reported as: ${machineLabel()}`);
  console.log(`Report written to: ${base}.md`);
  if (argv.includes("--unresolved")) {
    const rows = [...UNRESOLVED.entries()].sort((a, b) => b[1] - a[1]);
    const tot = rows.reduce((n, [, c]) => n + c, 0);
    console.log(`\nUnidentified externally-reaching actions: ${tot}`);
    console.log("These reached something real but named no resource we could extract.");
    console.log("The top rows are where new extraction rules would pay off most.\n");
    for (const [lbl, c] of rows.slice(0, 25))
      console.log(`  ${String(c).padStart(5)}  ${((c / tot) * 100).toFixed(1).padStart(5)}%  ${lbl}`);
    if (rows.length > 25) console.log(`  ... and ${rows.length - 25} more`);
  }
  if (argv.includes("--json")) {
    const clean = (v) => (v instanceof Set ? [...v].sort() : v);
    const obj = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, clean(v)]));
    const j = { version: VERSION, platform: platformLine(),
      agents: Object.fromEntries([...AGENTS].map(([k, v]) => [k, obj(v)])),
      mcp: [...MCP.values()].map(obj),
      redacted: REDACT,
      memoryReferences: [...MEM.values()].map((m) => ({ rtype: m.rtype, rid: redactRid(m.rid),
                                                        mentions: m.mentions, files: [...m.files].sort() })),
      resources: [...RES.values()].map((r) => ({ ...obj(r), rid: redactRid(r.rid),
                                                 group: resGroup(r.rtype),
                                                 reported: isReported(r.rtype) })) };
    writeReport(base + ".json", JSON.stringify(j, null, 1));
    console.log(`Machine-readable copy:  ${base}.json`);
  }
  console.log("Review the report, then share it manually if you choose to. Nothing was sent anywhere.");
}
main();
