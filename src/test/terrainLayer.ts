import { mat4 } from 'gl-matrix'
import TileManager from '../core/tile_manager'
import TileSource from '../core/tile_source'
import { createShader } from '../util/glLib'

export class TerrainLayer implements mapboxgl.CustomLayerInterface {

    id: string
    type: 'custom' = 'custom'
    renderingMode: '3d' = '3d'
    map!: mapboxgl.Map
    ready: boolean = false

    // Tile resources
    tileManager: TileManager
    tileSource: TileSource

    // WebGL resources
    private gl: WebGL2RenderingContext | null = null
    private program: WebGLProgram | null = null

    constructor(id: string, tileManager: TileManager) {
        this.id = id

        tileManager.addSource({
            id: 'localTerrainRGB',
            type: 'raster',
            url: 'http://127.0.0.1:8079/test/{z}/{x}/{y}.png',
        })

        this.tileManager = tileManager
        this.tileSource = tileManager.getSource('localTerrainRGB')!
    }

    async onAdd(map: mapboxgl.Map, gl: WebGL2RenderingContext) {
        this.gl = gl
        this.map = map

        this.program = await createShader(gl, '/shader/raster_tile_show.glsl')


        this.ready = true
    }

    render(gl: WebGL2RenderingContext, _matrix: number[]) {
        if (!this.ready) {
            this.map.triggerRepaint()
            return
        }

        const tiles = this.tileSource.coveringTiles()

        for (let rasterTile of tiles) {
            const posMatrix = rasterTile.tilePosMatrix()
            const tMVP = mat4.create()
            mat4.multiply(tMVP, this.tileManager.sharingVPMatrix, posMatrix)

            gl.useProgram(this.program)
            gl.uniformMatrix4fv(gl.getUniformLocation(this.program!, 'tMVP'), false, tMVP)
            gl.uniform1f(gl.getUniformLocation(this.program!, 'u_scale'), rasterTile.u_scale)
            gl.uniform2fv(gl.getUniformLocation(this.program!, 'u_topLeft'), rasterTile.u_topLeft)

            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, rasterTile.gpuTexture)
            gl.uniform1i(gl.getUniformLocation(this.program!, 'tileTexture'), 0)

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        }


    }
}
