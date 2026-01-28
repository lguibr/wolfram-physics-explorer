use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

pub mod rules;
pub mod renderer;

// GraphNode and GraphLink are defined below
use crate::rules::PhysicsRule;

/// Represents a single node in the hypergraph.
///
/// Designed to be serialized directly to JS objects for rendering.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GraphNode {
    /// Unique identifier for the node (usually stringified integer).
    pub id: String,
    /// The generation/step in which this node was created.
    pub group: i32,
    /// Optional payload value (e.g., charge, mass).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub val: Option<i32>,
}

/// Represents a directed edge between two nodes.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GraphLink {
    /// ID of the source node.
    pub source: String,
    /// ID of the target node.
    pub target: String,
    /// Optional weight or interaction strength.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<f64>,
}

/// A snapshot of the full hypergraph state at a specific step.
///
/// Used for bulk serialization/deserialization when saving or loading simulation state.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HypergraphState {
    pub nodes: Vec<GraphNode>,
    pub links: Vec<GraphLink>,
    pub step: i32,
    #[serde(rename = "maxNodeId")]
    pub max_node_id: i32,
}

mod utils {
    /// Configures the panic hook for better error messaging in the browser console.
    pub fn set_panic_hook() {
        #[cfg(feature = "console_error_panic_hook")]
        console_error_panic_hook::set_once();
    }
}

/// The core container for the simulation state.
///
/// The `Universe` struct holds all nodes, links, and the current simulation step.
/// It acts as the single source of truth for the physics engine, residing in WASM memory.
/// JavaScript interacts with this struct via the methods exposed by `#[wasm_bindgen]`.
#[wasm_bindgen]
pub struct Universe {
    nodes: Vec<GraphNode>,
    links: Vec<GraphLink>,
    step: i32,
    max_node_id: i32,
    rule: Option<Box<dyn PhysicsRule>>,
    renderer: Option<renderer::Renderer>,
}

#[wasm_bindgen]
impl Universe {
    /// Creates a new, initialized Universe with a single "genesis" node.
    ///
    /// This sets up the panic hook for debugging and initializes the graph
    /// with `max_node_id = 1` and `step = 0`.
    pub fn new() -> Universe {
        utils::set_panic_hook();
        let initial_node = GraphNode {
            id: "1".to_string(),
            group: 0,
            val: Some(1),
        };
        Universe {
            nodes: vec![initial_node],
            links: Vec::new(),
            step: 0,
            max_node_id: 1,
            rule: None,
            renderer: None,
        }
    }

    /// Initializes the WebGPU renderer on the provided canvas.
    ///
    /// # Arguments
    /// * `canvas` - The HTMLCanvasElement to render to.
    pub async fn init_renderer(&mut self, canvas: web_sys::HtmlCanvasElement) {
        let renderer = renderer::Renderer::new(canvas).await;
        self.renderer = Some(renderer);
    }

    /// Sets the active physics rule for the simulation.
    ///
    /// # Arguments
    ///
    /// * `rule_id` - A string identifier for the rule (e.g., "binary-fission").
    ///               Supports parameterized rules like "growth_tree_3".
    pub fn set_rule(&mut self, rule_id: &str) {
        if rule_id == "binary-fission" || rule_id.starts_with("growth_tree_") {
             // simplified selection for now
             self.rule = Some(Box::new(crate::rules::growth::GrowthRule { branching_factor: 2 }));
        } else {
             self.rule = None; 
        }
    }

    /// Advances the simulation by one time step.
    ///
    /// This method:
    /// 1. Applies the configured `PhysicsRule` to the current state.
    /// 2. Extends the `nodes` and `links` vectors with the results.
    /// 3. Updates the `max_node_id` based on the new graph topology.
    /// 4. Increments the `step` counter.
    /// 5. Triggers a render frame if the renderer is initialized.
    pub fn tick(&mut self) {
        if let Some(rule) = &self.rule {
            let result = rule.apply(&self.nodes, &self.links, self.max_node_id, self.step);
            
            // Apply changes
            self.nodes.extend(result.new_nodes);
            self.links.extend(result.new_links);
            self.step += 1;
            
            // Update max_id (simplified)
            for node in &self.nodes {
                if let Ok(id) = node.id.parse::<i32>() {
                    if id > self.max_node_id {
                        self.max_node_id = id;
                    }
                }
            }
        }
        
        // Render if available
        if let Some(renderer) = &mut self.renderer {
            if let Err(_e) = renderer.render() {
                // Log error safely? For now just ignore or panic in debug
                // web_sys::console::error_1(&format!("Render error: {:?}", e).into());
            }
        }
    }
    
    /// Returns the current list of nodes to JavaScript.
    ///
    /// # Returns
    ///
    /// A `JsValue` containing the serialized array of `GraphNode` objects.
    pub fn get_nodes(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.nodes).unwrap()
    }
    
    /// Returns the current list of links to JavaScript.
    ///
    /// # Returns
    ///
    /// A `JsValue` containing the serialized array of `GraphLink` objects.
    pub fn get_links(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.links).unwrap()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::*;

    #[test]
    fn test_universe_tick() {
        let mut universe = Universe::new();
        universe.set_rule("binary-fission");
        universe.tick();
        
        // Initial 1 + 2 new = 3 nodes
        assert_eq!(universe.nodes.len(), 3);
        assert_eq!(universe.step, 1);
    }
}
