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
    /// X position
    #[serde(default)]
    pub x: f32,
    /// Y position
    #[serde(default)]
    pub y: f32,
    /// Z position
    #[serde(default)]
    pub z: f32,
    /// X velocity
    #[serde(skip)]
    pub vx: f32,
    /// Y velocity
    #[serde(skip)]
    pub vy: f32,
    /// Z velocity
    #[serde(skip)]
    pub vz: f32,
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

    pub fn log(s: &str) {
        web_sys::console::log_1(&s.into());
    }
}

// Macro for easier logging
#[macro_export]
macro_rules! console_log {
    ($($t:tt)*) => (crate::utils::log(&format!($($t)*)))
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
    params: PhysicsParams,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug)]
pub struct PhysicsParams {
    pub repulsion_strength: f32,
    pub drag: f32,
}

impl Default for PhysicsParams {
    fn default() -> Self {
        Self {
            repulsion_strength: 500.0,
            drag: 0.85,
        }
    }
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
            x: 0.0,
            y: 0.0,
            z: 0.0,
            vx: 0.0,
            vy: 0.0,
            vz: 0.0,
        };
        Universe {
            nodes: vec![initial_node],
            links: Vec::new(),
            step: 0,
            max_node_id: 1,
            rule: Some(Box::new(crate::rules::growth::GrowthRule { branching_factor: 2 })),
            renderer: None,
            params: PhysicsParams::default(),
        }
    }

    /// Initializes the WebGPU renderer on the provided canvas.
    ///
    /// # Arguments
    /// * `canvas` - The OffscreenCanvas to render to.
    pub async fn init_renderer(&mut self, canvas: web_sys::OffscreenCanvas) -> Result<(), JsValue> {
        // Use match to handle error, converting String error to JsValue
        match renderer::Renderer::new(canvas).await {
            Ok(r) => {
                self.renderer = Some(r);
                // Force initial render
                let _ = self.render_frame();
                Ok(())
            },
            Err(e) => {
                Err(JsValue::from_str(&e))
            }
        }
    }

    /// Resizes the renderer surface.
    pub fn resize_renderer(&mut self, width: u32, height: u32) {
        if let Some(renderer) = &mut self.renderer {
            renderer.resize(width, height);
            let _ = self.render_frame();
        }
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

    /// Updates the physics parameters (e.g. from UI sliders).
    pub fn update_params(&mut self, repulsion: f32, drag: f32) {
        self.params.repulsion_strength = repulsion;
        self.params.drag = drag;
    }

    /// Updates visual parameters (e.g. node size).
    pub fn update_visuals(&mut self, node_size: f32) {
        if let Some(renderer) = &mut self.renderer {
            renderer.node_size = node_size;
        }
        // Force re-render on visual change
        let _ = self.render_frame();
    }

    /// Updates the camera position (Orbit Control).
    pub fn update_camera(&mut self, eye_x: f32, eye_y: f32, eye_z: f32) {
        if let Some(renderer) = &mut self.renderer {
            renderer.update_camera(eye_x, eye_y, eye_z);
            // Re-render
            let _ = self.render_frame();
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
        // 1. Apply Rules
        if let Some(rule) = &self.rule {
            let result = rule.apply(&self.nodes, &self.links, self.max_node_id, self.step);
            self.nodes.extend(result.new_nodes);
            self.links.extend(result.new_links);
            self.step += 1;
            
            // Recalculate max_id efficiently
            if let Some(last) = self.nodes.last() {
                if let Ok(id) = last.id.parse::<i32>() {
                    self.max_node_id = id;
                }
            }
        }
        
        // 2. Physics (Panic-Safe Implementation)
        let repulsion = self.params.repulsion_strength;
        let drag = self.params.drag;
        let dt = 0.1;
        let limit = usize::min(self.nodes.len(), 500); 

        // O(N^2) Repulsion - READ ONLY PASS + MUTABLE APPLY
        // This avoids split_at_mut completely
        
        // We collect forces first
        let mut forces = vec![(0.0, 0.0, 0.0); limit];
        
        for i in 0..limit {
            let (mut fx, mut fy, mut fz) = (0.0, 0.0, 0.0);
            let node_i = &self.nodes[i];
            
            for j in 0..limit {
                if i == j { continue; }
                let other = &self.nodes[j];
                let dx = node_i.x - other.x;
                let dy = node_i.y - other.y;
                let dz = node_i.z - other.z;
                
                let dist_sq = dx*dx + dy*dy + dz*dz + 0.1; // Avoid div by zero
                let force = repulsion / dist_sq;
                let dist = dist_sq.sqrt();
                
                fx += (dx / dist) * force;
                fy += (dy / dist) * force;
                fz += (dz / dist) * force;
            }
            
            // Central Gravity
            let dist = (node_i.x*node_i.x + node_i.y*node_i.y + node_i.z*node_i.z).sqrt();
            fx -= node_i.x * 0.01 * dist;
            fy -= node_i.y * 0.01 * dist;
            fz -= node_i.z * 0.01 * dist;
            
            forces[i] = (fx, fy, fz);
        }
        
        // Apply forces
        for i in 0..limit {
            let (fx, fy, fz) = forces[i];
            let node = &mut self.nodes[i];
            
            node.vx = (node.vx + fx * dt) * drag;
            node.vy = (node.vy + fy * dt) * drag;
            node.vz = (node.vz + fz * dt) * drag;
            
            node.x += node.vx * dt;
            node.y += node.vy * dt;
            node.z += node.vz * dt;
        }
        
        // Render
        let _ = self.render_frame();
    }

    /// Triggers a re-render of the current state.
    pub fn render_frame(&mut self) -> Result<(), JsValue> {
        if let Some(renderer) = &mut self.renderer {
            renderer.update_instances(&self.nodes);
            match renderer.render() {
                 Ok(_) => {}, // console_log!("Render OK"),
                 Err(e) => {
                     console_log!("Render Failure: {}", e);
                     return Err(JsValue::from_str(&e.to_string()));
                 }
            }
        }
        Ok(())
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

    #[wasm_bindgen_test]
    fn test_universe_genesis() {
        // Requirement: At least one node on start
        let universe = Universe::new();
        assert!(universe.nodes.len() >= 1, "Universe must start with at least one node");
        assert_eq!(universe.nodes[0].id, "1", "First node should be ID 1");
    }

    #[wasm_bindgen_test]
    fn test_universe_tick_binary_fission() {
        let mut universe = Universe::new();
        universe.set_rule("binary-fission");
        universe.tick();
        
        // Initial 1 node -> 2 new nodes = 3 total
        assert_eq!(universe.nodes.len(), 3, "Binary fission should result in 3 nodes after 1 tick");
        assert_eq!(universe.step, 1);
    }

    #[test]
    fn test_serialization() {
        let universe = Universe::new();
        let nodes_js = universe.get_nodes();
        // Since we are in node environment for testing, this just asserts it doesn't panic
        assert!(!nodes_js.is_null());
    }
}
