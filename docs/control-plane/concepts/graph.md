# Portable Control Graph

A SpecControl workflow points to a finite directed acyclic graph.

```text
manual/event trigger
        |
        v
   entry node ----> typed nodes ----> terminal node
                         |
                         +-- bounded retry
                         +-- explicit failure route
```

Node types are `agent`, `approval`, `eval`, and `artifact`. Each type references its
matching canonical contract. Edges describe successful or decision outcomes; failure
routes describe what happens after a node exhausts any retry rule.

Validation proves internal references, reachability, acyclicity, and terminal behavior.
It does not schedule or execute nodes. Runtime syntax, environment IDs, model IDs,
scorers, run records, and telemetry storage belong to later phases.

