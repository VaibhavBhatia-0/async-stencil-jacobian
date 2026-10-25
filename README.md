# Async Stencil Jacobian

A personal CUDA and Python project by Vaibhav Bhatia exploring synchronization choices for a two-dimensional Jacobi stencil. The repository contains a standalone synchronous CUDA solver, a CPU reference, experiment tooling, profiling captures, and an offline strategy-selection workflow.

## Current status

- `jacobi.cu` is a standalone synchronous five-point Jacobi solver. It runs fixed 512 and 1024 grids and prints timing and CPU validation results.
- `harness_ml/` defines a separate, parameterized diffusion experiment with deterministic inputs, a CPU reference, data validation, plots, and a decision-tree selector.
- The current CUDA solver does **not** implement the harness equation or its command-line interface. A compatible synchronous executable and a block-asynchronous executable are needed before the full experiment can run.
- `results/` contains existing synchronous profiling captures. It does not contain a complete sync-versus-async dataset or validated ML conclusions.

## Numerical experiment

The parameterized harness uses a fixed Dirichlet boundary: the top edge is 100 and the other edges are 0. Its update is

`u_new = (u_old + r * (north + south + west + east) + dt_times_source) / (1 + 4*r)`

where `r = alpha*dt/h^2`. It checks the maximum absolute update every 10 iterations and stops when the residual is below `1e-5`. The experiment grid covers N in {512, 1024}, point and Gaussian sources, r in {1, 10, 100}, and strategies `sync`, `D1`, `D2`, `D4`, and `D8`, with three repeats. `D` is the number of local block sweeps between halo refreshes.

The intended comparison is time to convergence, iteration count, residual decay, speedup over synchronous execution, and iteration overhead. The offline decision tree uses problem features to select a strategy. These comparisons require measured output from compatible CUDA executables.

## Repository layout

| Path | Contents |
|---|---|
| `jacobi.cu` | Standalone synchronous CUDA solver |
| `harness_ml/` | CPU reference, input generation, experiment driver, audits, plots, and ML tools |
| `results/` | Result schema and saved synchronous profiling captures |
| `report/` | Generated experiment summary after a complete run |

## Setup and checks

The Python environment needs the packages in `harness_ml/requirements.txt`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r harness_ml\requirements.txt
python -m unittest discover -s harness_ml\tests -v
```

A small CPU reference run:

```powershell
python -m harness_ml.solver_cli --N 32 --source point --r 1 --strategy sync --max-iters 5000
```

To build and run the standalone CUDA solver, use an NVIDIA CUDA toolkit and an architecture flag supported by the target GPU. For example, on an `sm_120` GPU:

```powershell
New-Item -ItemType Directory -Force build | Out-Null
nvcc -O3 -arch=sm_120 jacobi.cu -o build\jacobi.exe
.\build\jacobi.exe
```

The saved profiler output in `results/` records the GPU and toolchain used for those measurements; it should not be taken as a benchmark for another device.

## Full experiment workflow

1. Implement or supply CUDA executables that follow [the solver interface](harness_ml/SOLVER_INTERFACE.md) and `harness_ml/experiment_spec.json`.
2. Copy `harness_ml/solvers.example.json` to `solvers.json` and adjust executable paths.
3. Run `python -m harness_ml.preflight --manifest solvers.json`.
4. Validate a small fixed-iteration grid with `python -m harness_ml.validate_grid` and compare the synchronous and D1 outputs.
5. Run `python -m harness_ml.pipeline --manifest solvers.json`.

The pipeline expects 180 successful runs. It audits coverage and convergence before generating plots, an ML evaluation, and `report/experiment_summary.md`. No synthetic timings are included as project results. See [the harness guide](harness_ml/README.md) for command details and [the results schema](results/SCHEMA.md) for output columns.

## Limits

The block-asynchronous solver is not present in this repository yet. The current standalone CUDA solver also uses plain neighbour averaging, whereas the parameterized experiment includes `r` and source terms. Results and ML claims should be generated only after those implementations are integrated and validated on the same device.
