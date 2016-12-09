"use strict";

//import * as settings from 'settings';

var settings = settings || {};
settings.SCALE = 1;
settings.MARGIN = 1; // >= 1
settings.PITCH = settings.MARGIN + 1;
settings.COLOR_SET = {ROUGH: 0xffffff, SMOOTH: 0x1e90ff, MODULE: 0xffefd5, PIN: 0xfff095};
settings.DEFAULT_COLOR = 0xffffff;
settings.DEFAULT_TRANSPARENT = false;
settings.DEFAULT_OPACITY = 0.3;
settings.DISPLAY_EDGES_FLAG = true;
settings.DIRECTIONAL_LIGHT_LEVEL = 0.7;
settings.AMBIENT_LIGHT_LEVEL = 0.4;

function is_same(type, obj) {
  var clas = Object.prototype.toString.call(obj).slice(8, -1);
  return obj !== undefined && obj !== null && clas === type;
}

class Vector {
  clone() {
    return new Vector(...this.get_basis_());
  }

  operate(operation, n = 1, basis = this.get_base_names_()) {
    if(!Array.isArray(basis)) basis = [basis];
    let vector = this.clone();
    for(let base of basis) {
      vector[base] = operation(vector[base], typeof n === 'number' ? n : n[base]);
    }
    return vector;
  }

  add(n = 1, basis) {
    let operation = (a, b) => {return a + b;};
    return this.operate(operation, n, basis);
  }

  sub(n = 1, basis) {
    let operation = (a, b) => {return a - b;};
    return this.operate(operation, n, basis);
  }

  mul(n = 1, basis) {
    let operation = (a, b) => {return a * b;};
    return this.operate(operation, n, basis);
  }

  div(n = 1, basis) {
    let operation = (a, b) => {return a / b;};
    return this.operate(operation, n, basis);
  }

  mod(n = 1, basis) {
    let operation = (a, b) => {return a % b;};
    return this.operate(operation, n, basis);
  }

  to_array() {
    return this.get_basis_();
  }

  get_basis_() {
    return [];
  }

  get_base_names_() {
    return [];
  }
}

class Vector3D extends Vector {
  constructor(x = 0, y = 0, z = 0) {
    super();
    Object.assign(this, {x, y, z});
  }

  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  clone() {
    return new Vector3D(...this.get_basis_());
  }

  get_basis_() {
    return [this.x, this.y, this.z];
  }

  get_base_names_() {
    return ['x', 'y', 'z'];
  }
}

class Size extends Vector3D {
  clone() {
    return new Size(...this.get_basis_());
  }

  static diff(a, b) {
    let w = Math.abs(Math.abs(a.x - b.x) - 1);
    let h = Math.abs(Math.abs(a.y - b.y) - 1);
    let d = Math.abs(Math.abs(a.z - b.z) - 1);
    return new Size(x, y, z);
  }
}

class Pos extends Vector3D {
  clone() {
    return new Pos(...this.get_basis_());
  }

  is_less_than(other) {
    if(this.z < other.z) return true;
    if(this.z > other.z) return false;
    if(this.y < other.y) return true;
    if(this.y > other.y) return false;
    if(this.x < other.x) return true;
    return false;
  }

  static compare(a, b) {
    if(a.z < b.z) return -1;
    if(a.z > b.z) return 1;
    if(a.y < b.y) return -1;
    if(a.y > b.y) return 1;
    if(a.x < b.x) return -1;
    if(a.x > b.x) return 1;
    return 0;
  }

  static min(a, b) {
    if(a.is_less_than(b)) return a;
    return b;
  }
}

class Polyhedron {
  constructor(pos, size, color = settings.DEFAULT_COLOR, transparent = settings.DEFAULT_TRANSPARENT, opacity = settings.DEFAULT_OPACITY) {
    this.pos = pos.clone();
    this.size = size.clone();
    Object.assign(this, {color, transparent, opacity});
  }

  create_meshes(geometry) {
    let material = new THREE.MeshPhongMaterial({color: this.color, transparent: this.transparent, opacity: this.opacity});
    let mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...this.pos.mul(settings.SCALE).to_array());
    return [mesh];
  }

  get_visible_parameters() {
    return [this.color, this.transparent, this.opacity];
  }

  clone() {
    return new Polyhedron(...this.get_properties_());
  }

  get_properties_() {
    let properties = []
    for(let property in this) {
      properties.push(this[property]);
    }
    return properties;
  }
}

class Rectangular extends Polyhedron {
  create_meshes() {
    let geometry = new THREE.BoxGeometry(...this.size.mul(settings.SCALE).to_array());
    return super.create_meshes(geometry);
  }

  clone() {
    return new Rectangular(...this.get_properties_());
  }
}

class SquarePyramid extends Polyhedron {
  constructor(pos, bottom_len, height, axis = 'z', reverse = false, ...visible) {
    super(pos, new Size(bottom_len, bottom_len, height), ...visible);
    let r = reverse ? Math.PI : 0;
    if(axis === 'x')      this.rotation = [0, r - Math.PI / 2, 0];
    else if(axis === 'y') this.rotation = [r - Math.PI / 2, 0, 0];
    else if(axis === 'z') this.rotation = [r, 0, 0];
  }

  create_meshes(color = settings.DEFAULT_COLOR, transparent = settings.DEFAULT_TRANSPARENT, opacity = settings.DEFAULT_OPACITY) {
    let geometry = new THREE.ConeGeometry(this.size.x * settings.SCALE / Math.SQRT2, this.size.z * settings.SCALE, 4);
    let mesh = super.create_meshes(geometry, color, transparent, opacity);
    mesh.rotation.set(...this.rotation);
    return mesh;
  }

  clone() {
    return new SquarePyramid(...this.get_properties_());
  }
}

class Defect extends Rectangular {
  clone() {
    return new Defect(...this.get_properties_());
  }
}

class Vertex extends Defect {
  constructor(pos, ...visible) {
    let size = new Size(1, 1, 1);
    super(pos.mul(settings.PITCH), size, ...visible);
  }

  get_next(base, n = 1) {
    let vertex = this.clone();
    vertex.pos[base] += n * settings.PITCH;
    return vertex;
  }

  clone() {
    return new Vertex(...this.get_properties_());
  }

  static compare(a, b) {
    return Pos.compare(a.pos, b.pos);
  }

  static min(a, b) {
    if(a.pos.is_less_than(b.pos)) return a;
    return b;
  }

  static max(a, b) {
    if(a.pos.is_less_than(b.pos)) return b;
    return a;
  }
}

class Edge extends Defect {
  constructor(vertex_a, vertex_b, ...visible) {
    for(let vertex of [vertex_a, vertex_b]) {
      // 頂点オブジェクトをコピーして色を設定
      if(vertex instanceof Vertex) vertex = new Vertex(vertex.pos, ...visible);
      // 引数がPosオブジェクトならVertexを生成
      else                         vertex = new Vertex(vertex, ...visible);
    }
    Edge.check_params(vertex_a, vertex_b);
    let vertices = [vertex_a, vertex_b].sort(Vertex.compare);
    vertex_a = vertices[0];
    vertex_b = vertices[1];
    let axis = Edge.get_axis_(vertex_a, vertex_b);
    let pos = Edge.get_pos_(vertex_a, vertex_b, axis);
    let size = Edge.get_size_(vertex_a, vertex_b, axis);
    super(pos, size, ...visible);
    this.axis = axis;
    this.vertices = vertices;
  }

  decompose_to_minimum_units() {
    let decomposed_edges = [];
    for(let vertex = this.vertices[0]; Vertex.compare(vertex, this.vertices[1]) === -1;) {
      let next_vertex = vertex.get_next(this.axis);
      decomposed_edges.push(new Edge(vertex, next_vertex));
      console.assert(false, vertex.pos, next_vertex.pos);
      vertex = next_vertex;
    }
    return decomposed_edges;
  }

  clone() {
    return new Edge(...this.vertices, ...this.get_visible_parameters());
  }

  static check_params(vertex_a, vertex_b) {
    let n = 0;
    if(vertex_a.pos.x !== vertex_b.pos.x) ++n;
    if(vertex_a.pos.y !== vertex_b.pos.y) ++n;
    if(vertex_a.pos.z !== vertex_b.pos.z) ++n;
    console.assert(n === 1, "wrong positions of vertices");
    return n === 1;
  }

  static get_axis_(vertex_a, vertex_b) {
    if(vertex_a.pos.x !== vertex_b.pos.x) return 'x';
    if(vertex_a.pos.y !== vertex_b.pos.y) return 'y';
    if(vertex_a.pos.z !== vertex_b.pos.z) return 'z';
    console.assert(false, "wrong positions of vertices");
  }

  static get_pos_(vertex_a, vertex_b, axis) {
    return vertex_a.pos.add(vertex_b.pos, axis).div(2, axis);
  }

  static get_size_(vertex_a, vertex_b, axis) {
    let size = new Size(1, 1, 1);
    size[axis] = vertex_b.pos[axis] - vertex_a.pos[axis] - 1;
    return size;
  }

  static create_edges(vertices, is_loop = false) {
    let edges = [];
    for(let i = 0; i < vertices.length - 1; ++i) {
      let edge = new Edge(vertices[i], vertices[i + 1]);
      edges.push(edge);
    }
    if(is_loop) {
      let edge = new Edge(vertices[vertices.length - 1], vertices[0]);
      edges.push(edge);
    }
    return edges;
  }
}

class Block extends Edge {
  clone() {
    return new Block(...this.vertices, ...this.get_visible_parameters());
  }
}

class Injector {
  create_meshes() {
    let height = this.size[this.axis] / 2;
    let opposite_pos = this.pos.add(this.size[axis], this.axis);
    let pyramid_a = new SquarePyramid(this.pos, 1, height, axis);
    let pyramid_b = new SquarePyramid(opposite_pos, 1, height, axis, true);
    return [...pyramid_a.create_meshes(), ...pyramid_b.create_meshes()];
  }

  clone() {
    return new Injector(...this.vertices, ...this.get_visible_parameters());
  }
}

class Cap extends Injector {
  constructor(vertex_a, vertex_b, color = settings.DEFAULT_COLOR, transparent = true, opacity = settings.DEFAULT_OPACITY) {
    super(vertex_a, vertex_b, color, transparent, opacity);
  }

  clone() {
    return new Cap(...this.vertices, ...this.get_visible_parameters());
  }
}

class LogicalQubit {
  constructor(edges, color = settings.DEFAULT_COLOR, transparent = settings.DEFAULT_TRANSPARENT, opacity = settings.DEFAULT_OPACITY) {
    Object.assign(this, {edges, color, transparent, opacity})
    this.vertices = this.create_vertices_();
  }

  create_meshes() {
    let meshes = [];
    for(let defects of [this.edges, this.vertices]) {
      for(let defect of defects) {
        meshes.push(...defect.create_meshes());
      }
    }
    return meshes;
  }

  create_vertices_() {
    let vertices = new Set();
    for(let edge of this.edges) {
      for(let vertex of edge.vertices) {
        vertices.add(vertex);
      }
    }
    return vertices;
  }
}

class Rough extends LogicalQubit {
  constructor(edges, color = settings.COLOR_SET.ROUGH, transparent = settings.DEFAULT_TRANSPARENT, opacity = settings.DEFAULT_OPACITY) {
    super(edges, color, transparent, opacity);
  }
}

class Smooth extends LogicalQubit {
  constructor(edges, color = settings.COLOR_SET.SMOOTH, transparent = settings.DEFAULT_TRANSPARENT, opacity = settings.DEFAULT_OPACITY) {
    super(edges, color, transparent, opacity);
  }
}

class Module extends Rectangular {
  constructor(pos, size, color = settings.COLOR_SET.MODULE, transparent = settings.DEFAULT_TRANSPARENT, opacity = settings.DEFAULT_OPACITY) {
    super(pos, size, color, transparent, opacity);
  }
};

class Circuit {
  constructor(logical_qubits, modules) {
    Object.assign(this, {logical_qubits, modules});
  }

  create_meshes(color = settings.DEFAULT_COLOR, transparent = settings.DEFAULT_TRANSPARENT, opacity = settings.DEFAULT_OPACITY) {
    let meshes = [];
    for(let polyhedrons of [this.logical_qubits, this.modules]) {
      for(let polyhedron of polyhedrons) {
        meshes.push(...polyhedron.create_meshes(color, transparent, opacity));
      }
    }
    return meshes;
  }
}

class CircuitCreator {
  static create(data) {
    let logical_qubits = this.create_logical_qubits(data.logical_qubits);
    let modules = this.create_modules(data.modules);
    return new Circuit(logical_qubits, modules);
  }

  static create_logical_qubits(data = []) {
    let logical_qubits = [];
    for(let logical_qubit_data of data) {
      let blocks    = this.create_blocks(logical_qubit_data.blocks);
      let injectors = this.create_injectors(logical_qubit_data.injectors);
      let caps      = this.create_caps(logical_qubit_data.caps);
      let type = logical_qubit_data.type;
      let cls = type === 'rough' ? Rough : Smooth;
      logical_qubits.push(new cls([...blocks, ...injectors, ...caps]));
    }
    return logical_qubits;
  }

  static create_modules(data = []) {
    let modules = [];
    for(let module_data of data) {
      let pos = new Pos(...module_data.position);
      let size = new Size(...module_data.size);
      edges.push(new Module(pos, size));
    }
    return modules;
  }

  static create_blocks(data) {
    return this.create_edges_(data, Block);
  }

  static create_injectors(data) {
    return this.create_edges_(data, Injector);
  }

  static create_caps(data) {
    return this.create_edges_(data, Cap);
  }

  static create_edges_(data = [], cls) {
    let edges = [];
    for(let vertices of data) {
      let vertex_a = new Vertex(new Pos(...vertices[0]));
      let vertex_b = new Vertex(new Pos(...vertices[1]));
      edges.push(new cls(vertex_a, vertex_b));
    }
    return edges;
  }
}

class CircuitDrawer {
  static draw(circuit, scene) {
    for(let mesh of circuit.create_meshes()) {
      scene.add(mesh);
      if(settings.DISPLAY_EDGES_FLAG) {
        let edge = new THREE.EdgesHelper(mesh, 0x000000);
        scene.add(edge);
      }
    }
  }
}

var main = function(data) {
  var scene = new THREE.Scene();

  var width  = window.innerWidth;
  var height = window.innerHeight;
  var fov    = 60;
  var aspect = width / height;
  var near   = 1;
  var far    = 1000;
  var camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, -40, 35);

  var renderer = new THREE.WebGLRenderer();
  renderer.setSize(width, height);
  renderer.setClearColor(new THREE.Color(0xffffff));
  document.getElementById('canvas').appendChild(renderer.domElement);

  var directionalLight = new THREE.DirectionalLight(0xffffff, settings.DIRECTIONAL_LIGHT_LEVEL);
  var ambientLight = new THREE.AmbientLight(0xffffff, settings.AMBIENT_LIGHT_LEVEL);
  directionalLight.position.set(0, -0.5, 0.7);
  scene.add(directionalLight);
  scene.add(ambientLight);

  var circuit = CircuitCreator.create(data);

  CircuitDrawer.draw(circuit, scene);

  var controls = new THREE.OrbitControls(camera);

  (function renderLoop() {
    requestAnimationFrame(renderLoop);
    controls.update();
    renderer.render(scene, camera);
  })();
};

//window.addEventListener('DOMContentLoaded', main, false);

function handleFileSelect() {
  var file = document.getElementById('file').files[0];
  var reader = new FileReader();

  reader.onload = function(evt) {
    document.getElementById('input').style.display = 'none';
    let json = evt.target.result;
    let data = JSON.parse(json);
    main(data);
  };

  reader.readAsText(file, 'utf-8');
}
