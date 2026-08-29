# shared-memory

The banks that follow the person rather than the repo: how they are offered as
MCP servers, and provisioning them on the service.

- Bank _contents_ and their purpose are the vault's and Hindsight's business;
  this domain only decides where the servers point.
- Endpoint and bank list come from `config/hindsight.yml`, never from constants
  here.
- Nothing about a particular repo belongs here — see `project-memory`.
