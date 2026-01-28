use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

pub mod rules;

// GraphNode and GraphLink are defined below
use crate::rules::{EvolutionResult, PhysicsRule};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GraphNode {
    pub id: String,
    pub group: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub val: Option<i32>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GraphLink {
    pub source: String,
    pub target: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<f64>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HypergraphState {
    pub nodes: Vec<GraphNode>,
    pub links: Vec<GraphLink>,
    pub step: i32,
    #[serde(rename = "maxNodeId")]
    pub max_node_id: i32,
}

#[wasm_bindgen]
pub fn evolve_universe(
    current_state_val: JsValue,
    rule_id: &str,
    max_nodes_limit: usize,
) -> Result<JsValue, JsValue> {
    let current_state: HypergraphState = serde_wasm_bindgen::from_value(current_state_val.clone())?;
    
    let new_step = current_state.step + 1;
    let mut max_id = current_state.max_node_id;

    // Direct mapping for now until we have a full registry
    // In production this would use a HashMap registry
    let result = if rule_id.starts_with("growth_tree_") {
        let factor = rule_id.split('_').last().unwrap().parse().unwrap_or(2);
        let rule = rules::growth::GrowthRule { branching_factor: factor };
        Some(rule.apply(&current_state.nodes, &current_state.links, max_id, new_step))
    } else {
        None
    };

    if let Some(res) = result {
        let mut next_nodes = current_state.nodes.clone();
        let mut next_links = current_state.links.clone();
        
        // Manual "state update" logic similar to TS
        // Note: In a real ECS we'd be more efficient
        let remaining_space = max_nodes_limit.saturating_sub(next_nodes.len());
        let nodes_to_add = res.new_nodes.into_iter().take(remaining_space).collect::<Vec<_>>();
        
        // Update max_id
        for n in &nodes_to_add {
             if let Ok(val) = n.id.parse::<i32>() {
                 if val > max_id { max_id = val; }
             }
        }

        // Add links only if both ends exist (simplified check for now)
        // In Rust using a HashSet for IDs would be O(1)
        let added_ids: std::collections::HashSet<String> = nodes_to_add.iter().map(|n| n.id.clone()).collect();
        let existing_ids: std::collections::HashSet<String> = next_nodes.iter().map(|n| n.id.clone()).collect();
        
        let links_to_add: Vec<GraphLink> = res.new_links.into_iter().filter(|l| {
             (added_ids.contains(&l.target) || existing_ids.contains(&l.target)) &&
             (added_ids.contains(&l.source) || existing_ids.contains(&l.source))
        }).collect();

        next_nodes.extend(nodes_to_add);
        next_links.extend(links_to_add);

        let new_state = HypergraphState {
            nodes: next_nodes,
            links: next_links,
            step: new_step,
            max_node_id: max_id,
        };
        
        let serialized = serde_wasm_bindgen::to_value(&new_state)?;
        Ok(serialized)
    } else {
        // Return original if rule not found
        Ok(current_state_val)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::*;

    #[test]
    fn test_binary_fission() {
        let node = GraphNode { id: "1".to_string(), group: 0, val: Some(1) };
        let state = HypergraphState {
            nodes: vec![node],
            links: vec![],
            step: 0,
            max_node_id: 1,
        };

        let rule = rules::growth::GrowthRule { branching_factor: 2 };
        let result = rule.apply(&state.nodes, &state.links, 1, 1);

        assert_eq!(result.new_nodes.len(), 2);
        assert_eq!(result.new_links.len(), 2);
        assert_eq!(result.new_nodes[0].group, 1);
    }
}
