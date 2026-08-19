// Prism core + the languages the Go lessons use. `go` is the primary language
// — every code sample the course teaches. `bash` covers the toolchain (`go`
// command, shell) and terminal sessions. `json` covers small config/data
// snippets and JSON encoding examples. Plain `text` fences (program output,
// go.mod files, directory trees, error messages) are left unhighlighted.
import Prism from 'prismjs';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism-tomorrow.css';

export default Prism;
