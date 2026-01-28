use crate::{GraphNode, GraphLink};
use super::{EvolutionResult, PhysicsRule};

pub struct GrowthRule {
    pub branching_factor: i32,
}

impl PhysicsRule for GrowthRule {
    fn apply(
        &self,
        nodes: &[GraphNode],
        _links: &[GraphLink],
        mut max_id: i32,
        step: i32,
    ) -> EvolutionResult {
        let active_group = step - 1;
        let active_nodes: Vec<&GraphNode> = nodes
            .iter()
            .filter(|n| n.group == active_group)
            .collect();

        // Fallback if no active nodes, take the last one
        let targets = if !active_nodes.is_empty() {
             active_nodes
        } else if let Some(last) = nodes.last() {
             vec![last]
        } else {
             vec![]
        };

        // Slice to 50 max to match TS logic for now (though Rust is faster!)
        let process_list = if targets.len() > 50 {
            &targets[0..50]
        } else {
            &targets[..]
        };

        let mut new_nodes = Vec::new();
        let mut new_links = Vec::new();

        for node in process_list {
            for _ in 0..self.branching_factor {
                max_id += 1;
                let id = max_id.to_string();
                
                new_nodes.push(GraphNode {
                    id: id.clone(),
                    group: step,
                    val: Some(1),
                });
                
                new_links.push(GraphLink {
                    source: node.id.clone(),
                    target: id,
                    value: None,
                });
            }
        }

        EvolutionResult {
            new_nodes,
            new_links,
        }
    }
}
