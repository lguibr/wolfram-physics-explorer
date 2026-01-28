pub mod growth;

use crate::{GraphNode, GraphLink};

pub struct EvolutionResult {
    pub new_nodes: Vec<GraphNode>,
    pub new_links: Vec<GraphLink>,
}

pub trait PhysicsRule {
    fn apply(
        &self,
        nodes: &[GraphNode],
        links: &[GraphLink],
        max_id: i32,
        step: i32,
    ) -> EvolutionResult;
}
