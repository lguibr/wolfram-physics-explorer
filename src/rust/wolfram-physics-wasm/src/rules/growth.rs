use crate::{GraphNode, GraphLink};
use super::{EvolutionResult, PhysicsRule};

/// A rule that implements exponential growth via node splitting (mitosis-like).
///
/// In each step, active nodes from the previous step are split into `branching_factor` new nodes.
pub struct GrowthRule {
    /// The number of new nodes created from each active node (e.g., 2 for binary fission).
    pub branching_factor: i32,
}

impl PhysicsRule for GrowthRule {
    /// Applies the growth rule.
    ///
    /// Logic:
    /// 1. Identify "active" nodes (those created in the previous step).
    /// 2. For each active node, generate `branching_factor` new nodes.
    /// 3. Create links from the parent node to these new child nodes.
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
                    x: node.x + (max_id % 10 - 5) as f32 * 0.1, // Slight jitter
                    y: node.y + (max_id % 7 - 3) as f32 * 0.1,
                    z: node.z + (max_id % 3 - 1) as f32 * 0.1,
                    vx: 0.0,
                    vy: 0.0,
                    vz: 0.0,
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
