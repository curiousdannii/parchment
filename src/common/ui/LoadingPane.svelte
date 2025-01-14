<script lang="ts">
    import prettyBytes from 'pretty-bytes'

    import '../../upstream/asyncglk/src/common/ui/common.css'

    import type {FileSize} from '../interface.js'

    export let cover_image_url: string
    export let play: () => void
    export let playing: boolean = false
    export let title: string

    let progress = 0
    let set_storyfile_size = false
    let totalsize = 0
    let totalsize_gz = 0

    export function add_file(filesize: FileSize, is_storyfile?: boolean) {
        totalsize += filesize.size
        totalsize_gz += filesize.gz
        if (is_storyfile) {
            set_storyfile_size = true
        }
    }

    export function update_progress(chunk_length: number) {
        progress += chunk_length
    }

    function on_play() {
        playing = true
        play()
    }
</script>

<style>
    :global(#loadingpane) {
        position: absolute;
        width: 100%;
        text-align: center;
        top: 20%;
    }

    progress {
        width: 250px;
    }
</style>

<div id="loadingpane" class="asyncglk_ui">
    <h1>{title}</h1>
    <p><img src="{cover_image_url}" alt="Cover art"></p>
    {#if playing}
        {#if set_storyfile_size}
            <p><progress max="${totalsize}" value="{progress}"></progress></p>
            <p>{prettyBytes(totalsize_gz, {maximumFractionDigits: 1, minimumFractionDigits: 1})}</p>
        {:else}
            <p><progress></progress></p>
        {/if}
    {:else}
        <p><button on:click={on_play}>Play!</button></p>
    {/if}
</div>