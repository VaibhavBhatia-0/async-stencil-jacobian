# Reference, experiment, and ML harness

This package provides the CPU reference, deterministic problem generation, experiment orchestration, dataset checks, plots, and offline strategy selection. It does not contain the CUDA implementations needed for the full experiment.

`experiment_spec.json` defines the equation, boundaries, sources, experiment matrix, convergence settings, and timing scope. CUDA executables must use the same definitions. See [the solver interface](SOLVER_INTERFACE.md) for the process contract.

## Solver output

Each CUDA command is configured in a local `solvers.json` manifest. The preferred final stdout line is one JSON object:

```json
{"iterations": 1200, "time_ms": 18.5, "final_residual": 9.2e-6, "converged": true, "residual_history": [[10, 0.8], [20, 0.3]]}
```

The parser also accepts one labelled text result block. Both CUDA solvers and `reference.py` must implement:

`u_new = (u_old + r * neighbour_sum + dt_times_source) / (1 + 4*r)`

## Setup and validation

From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r harness_ml\requirements.txt
python -m unittest discover -s harness_ml\tests -v
```

For a small CPU smoke test:

```powershell
python -m harness_ml.solver_cli --N 32 --source point --r 1 --strategy sync --max-iters 5000
```

To validate a CUDA grid saved as NumPy `.npy` data after an exact iteration count:

```powershell
python -m harness_ml.validate_grid --gpu-grid results\gpu_grid.npy --N 32 --source point --r 1 --iterations 100
```

To export byte-identical initial grids and sources as row-major float32 files:

```powershell
python -m harness_ml.export_problem --N 512 --source gaussian --r 10 --output-dir results\integration_input
```

## Full experiment

Copy `harness_ml/solvers.example.json` to `solvers.json` and adjust executable paths. Check paths and placeholders without launching GPU work:

```powershell
python -m harness_ml.preflight --manifest solvers.json
```

Then run the complete pipeline:

```powershell
python -m harness_ml.pipeline --manifest solvers.json
```

The driver skips keys already present in `results/runs.csv`. `--rerun` first moves existing CSV files to timestamped backups. Before plots or ML are produced, the pipeline audits all 180 expected rows, duplicate keys, convergence, finite timings, and repeat coverage. Its outputs include:

- fixed-schema `runs.csv` and separate residual histories
- `audit.json` and reproducibility hashes
- timing summaries, convergence plots, and speedup tables
- strategy labels, near-tie flags, and leave-one-configuration-out predictions
- a saved decision tree and `report/experiment_summary.md`

The current `jacobi.cu` does not accept this interface and implements plain neighbour averaging. Compatible synchronous and block-asynchronous executables are required before collecting the final dataset.
