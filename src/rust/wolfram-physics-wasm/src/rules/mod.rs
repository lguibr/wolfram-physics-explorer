pub mod growth;

use crate::{GraphNode, GraphLink};

/// The result of applying a physics rule to the current state.
///
/// Contains the *deltas* (new nodes and links) that should be added to the universe.
pub struct EvolutionResult {
    /// New nodes generated in this step.
    pub new_nodes: Vec<GraphNode>,
    /// New links generated in this step.
    pub new_links: Vec<GraphLink>,
}

/// A trait representing a discrete physics rule that evolves the graph.
///
/// Implementors of this trait define the logic for how the universe transitions
/// from step `N` to `N+1`.
pub trait PhysicsRule {
    /// Applies the rule to the current graph state.
    ///
    /// # Arguments
    ///
    /// * `nodes` - The current list of all nodes in the universe.
    /// * `links` - The current list of all links in the universe.
    /// * `max_id` - The highest node ID currently in use (for generating new IDs).
    /// * `step` - The current simulation step.
    ///
    /// # Returns
    ///
    /// An `EvolutionResult` containing the new elements to add.
    fn apply(
        &self,
        nodes: &[GraphNode],
        links: &[GraphLink],
        max_id: i32,
        step: i32,
    ) -> EvolutionResult;
}
