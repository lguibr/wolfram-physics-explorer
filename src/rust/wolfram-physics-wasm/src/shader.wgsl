struct CameraUniform {
    view_proj: mat4x4<f32>,
};

@group(0) @binding(0)
var<uniform> camera: CameraUniform;

struct VertexInput {
    @location(0) position: vec3<f32>,
};

struct InstanceInput {
    @location(1) position: vec3<f32>,
    @location(2) color: vec3<f32>,
    @location(3) size: f32,
};

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) color: vec3<f32>,
    @location(1) uv: vec2<f32>,
};

@vertex
fn vs_main(
    model: VertexInput,
    instance: InstanceInput,
) -> VertexOutput {
    var out: VertexOutput;
    
    out.uv = model.position.xy;
    
    // Billboard logic: Scale model by instance size
    let scaled_pos = model.position * instance.size;
    let world_pos = scaled_pos + instance.position;
    
    out.clip_position = camera.view_proj * vec4<f32>(world_pos, 1.0);
    out.color = instance.color;
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    // Circle SDF
    let dist = length(in.uv);
    
    // Soft edge anti-aliasing
    let alpha = 1.0 - smoothstep(0.4, 0.5, dist);
    
    if (alpha < 0.01) {
        discard;
    }
    
    // Add an emissive core effect
    let core = 1.0 - smoothstep(0.0, 0.4, dist);
    let final_color = in.color + vec3<f32>(core * 0.5);

    return vec4<f32>(final_color, alpha);
}
