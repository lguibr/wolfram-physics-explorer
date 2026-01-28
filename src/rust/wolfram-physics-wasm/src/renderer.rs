// use wgpu::util::DeviceExt; // Temporarily commented out until buffers are added
// use wasm_bindgen::prelude::*;

/// Handles WebGPU rendering for the Universe.
///
/// This struct manages the GPU connection, buffers, and render pipelines.
/// It uses Instanced Rendering to draw millions of nodes efficiently.
pub struct Renderer {
    surface: wgpu::Surface<'static>,
    device: wgpu::Device,
    queue: wgpu::Queue,
    config: wgpu::SurfaceConfiguration,
    size: winit::dpi::PhysicalSize<u32>,
    // TODO: Add render pipeline and buffers
}

impl Renderer {
    /// Initializes a new Renderer hooked to a canvas.
    ///
    /// # Arguments
    /// * `canvas` - The HTMLCanvasElement to draw on (passed as a JsValue).
    pub async fn new(canvas: web_sys::HtmlCanvasElement) -> Self {
        // Need to enable polling for Wasm
        // see: https://github.com/gfx-rs/wgpu/wiki/Running-on-the-Web-with-WebAssembly
        
        // 1. Instance
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends: wgpu::Backends::all(),
            ..Default::default()
        });

        // 2. Surface
        // wgpu 0.19 supports creating surface directly from canvas via SurfaceTarget
        let surface = instance.create_surface(wgpu::SurfaceTarget::Canvas(canvas)).unwrap();

        // 3. Adapter
        let adapter = instance.request_adapter(
            &wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                compatible_surface: Some(&surface),
                force_fallback_adapter: false,
            },
        ).await.unwrap();

        // 4. Device & Queue
        let (device, queue) = adapter.request_device(
            &wgpu::DeviceDescriptor {
                required_features: wgpu::Features::empty(),
                required_limits: wgpu::Limits::downlevel_webgl2_defaults(),
                label: None,
            },
            None, // Trace path
        ).await.unwrap();

        // 5. Config
        let config = surface.get_default_config(&adapter, 800, 600).unwrap(); // Default size

        Self {
            surface,
            device,
            queue,
            config,
            size: winit::dpi::PhysicalSize::new(800, 600),
        }
    }

    /// Resizes the surface to match the canvas.
    pub fn resize(&mut self, width: u32, height: u32) {
        if width > 0 && height > 0 {
            self.size.width = width;
            self.size.height = height;
            self.config.width = width;
            self.config.height = height;
            self.surface.configure(&self.device, &self.config);
        }
    }

    /// Renders a single frame.
    pub fn render(&mut self) -> Result<(), wgpu::SurfaceError> {
        let output = self.surface.get_current_texture()?;
        let view = output.texture.create_view(&wgpu::TextureViewDescriptor::default());

        let mut encoder = self.device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("Render Encoder"),
        });

        {
            let _render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("Render Pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color {
                            r: 0.0,
                            g: 0.0,
                            b: 0.0, // Black background (Cosmic)
                            a: 1.0,
                        }),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                timestamp_writes: None,
                occlusion_query_set: None,
            });
        }

        self.queue.submit(std::iter::once(encoder.finish()));
        output.present();

        Ok(())
    }
}
