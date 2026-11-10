# Neuroimaging

## Project overview

This repository contains the code, notebooks, and research documents for a neuroimaging project using magnetic resonance imaging (MRI) data. The project is organized to support a reproducible workflow, from obtaining the original data to developing analyses and reporting results.

The initial data source is **OASIS-1**, the cross-sectional dataset from the Open Access Series of Imaging Studies (OASIS). The repository currently provides tools to download and extract the raw MRI archives. Further preprocessing, analysis, and research objectives will be documented as the project develops.

## Data source and access

**OASIS-1** is a publicly described neuroimaging dataset. Information about the study and its data-access requirements is available from the [OASIS website](https://sites.wustl.edu/oasisbrains/). **Before downloading or using the dataset**, review the [OASIS data-access and data-use terms](https://sites.wustl.edu/oasisbrains/request-access/), and obtain any required authorization.

This repository does **not** distribute the OASIS MRI data. Instead, it provides a reproducible procedure for obtaining the original archives from the source. The current download implementation expects 12 archives, named `oasis_cross-sectional_disc1.tar.gz` through `oasis_cross-sectional_disc12.tar.gz`.

## Requirements

- Python **3.11 or newer**.
- [`uv`](https://docs.astral.sh/uv/), used to manage the Python environment, install dependencies, and run commands.
- Internet access and sufficient free disk space to download and extract the selected MRI archives.
- A Jupyter-compatible editor (such as JupyterLab or VS Code) to work with the notebooks.

The Python project is configured in `pyproject.toml`, and the resolved dependency versions are recorded in `uv.lock`. Current declared runtime dependencies include **NumPy**, **NiBabel**, and **Matplotlib**; the development dependency group includes **IPython** and **IPykernel**.

## Getting started

Run the following commands from the **repository root**, unless otherwise indicated.

### 1. Clone the repository

```bash
git clone https://github.com/GenobitNeuroimaging/Neuroimaging.git
cd Neuroimaging
```

### 2. Create and synchronize the Python environment

Install `uv` if necessary, following its [official installation instructions](https://docs.astral.sh/uv/getting-started/installation/). Then run:

```bash
uv sync --locked
```

This creates or updates the local `.venv/` environment using the dependency versions in `uv.lock`. The virtual environment is local to each researcher's computer and is not tracked in Git.

To run Python within the managed environment:

```bash
uv run python --version
```

The repository uses an installable Python package under `src/Neuroimaging/`. Running project commands through `uv run` makes the configured environment and package available without manually activating the virtual environment.

### 3. Download the OASIS-1 raw data

There are **two alternative entry points** for obtaining the dataset. Both use the shared download and extraction functions in the `Neuroimaging` Python package.

#### Option A: Command-line script

The script `scripts/download_oasis1.py` automates downloading, extracting, and optionally removing the original compressed archives.

Download all 12 discs:

```bash
uv run python scripts/download_oasis1.py
```

Download only selected discs:

```bash
uv run python scripts/download_oasis1.py --discs 1 2 3
```

Preserve downloaded archives after extraction:

```bash
uv run python scripts/download_oasis1.py --discs 1 2 3 --keep-archives
```

Display the complete list of options:

```bash
uv run python scripts/download_oasis1.py --help
```

By default, the extracted files are placed in `data/raw/`. The `--output` argument can be used to select a different destination.

#### Option B: Jupyter notebook

The notebook [`notebooks/1_download_data.ipynb`](notebooks/1_download_data.ipynb) documents the data acquisition procedure step by step. It is intended for researchers who want to inspect and execute the stages separately:

1. **Configuration:** Choose the discs and destination directories.
2. **Download:** Retrieve the original compressed archives.
3. **Extraction:** Extract their contents into the raw-data directory.
4. **Cleanup:** Optionally delete temporary downloaded archives.

Open the notebook in a Jupyter-compatible editor and select the Python kernel associated with the project's `.venv/` environment. Execute the cells in order and read the accompanying explanations. The notebook and script are alternative interfaces to the same underlying functionality; it is not necessary to run both.

### 4. Confirm the data acquisition

After extraction, inspect `data/raw/` to verify that the expected MRI files are present. The script uses the following auxiliary directories:

- `data/raw/.archives/`: Downloaded compressed archives, if retained or not yet extracted.
- `data/raw/.extracted/`: Completion markers such as `disc1.done`, used to skip discs previously extracted successfully.

The download helper writes to temporary `.part` files and renames completed downloads. The extraction helper checks archive members for unsafe paths and file types, extracts to a temporary staging directory, and writes a completion marker after extraction finishes. These mechanisms help make reruns safer, but **a completion marker is not a substitute for an independent scientific data-integrity check**.

## Repository structure

The following is a simplified view of the current repository:

```text
Neuroimaging/
├── README.md                 # Project overview and reproduction instructions
├── CONTRIBUTING.md           # Contribution guidelines
├── LICENSE                   # Repository license
├── pyproject.toml            # Python project metadata and dependencies
├── uv.lock                   # Locked Python dependency versions
├── .gitignore                # Excluded local and generated files
├── .devcontainer/            # Development-container configuration
├── .github/workflows/        # GitHub automation
├── data/                     # Local data; excluded from Git
│   └── raw/                  # Downloaded/extracted OASIS-1 data
├── notebooks/
├── scripts/
├── src/
│   └── Neuroimaging/
│       ├── __init__.py
├── quarto/
│   ├── _quarto.yaml          # Quarto project configuration
│   └── reports/              # Report sources
├── docs/
│   ├── manuscript/           # LaTeX manuscript: v1/ (sources, figures), tables/ (shared)
│   └── reports/              # Report outputs
└── references.bib            # Bibliographic references
```

Some directories, including `data/`, are created locally during execution and may not exist in a fresh clone.

## Reproducibility and project conventions

**Environment.** Use `uv sync --locked` to reconstruct the Python environment from the tracked lockfile. Prefer `uv run` when executing project scripts. When dependencies are intentionally changed, update the project configuration and lockfile together and commit both.

**Data provenance.** Obtain original data from the OASIS source rather than committing dataset copies to the repository. Preserve the distinction between original downloaded data and any future derived or processed data. Record the selected discs, access date, and any dataset version or source changes when documenting an analysis.

**Reusable code.** Place reusable functions in `src/Neuroimaging/` and use scripts or notebooks to orchestrate them. This reduces duplication and helps ensure that command-line and notebook workflows use the same implementations.

**Notebooks and reports.** Use notebooks for documented computational procedures and exploration. The repository also contains Quarto report sources and a LaTeX manuscript for research communication. Report-generation instructions and analysis-specific procedures will be expanded as those components mature.

**Version control.** Commit source code, configuration, lockfiles, notebooks, and research documents as appropriate. Do not commit `.venv/`, downloaded MRI data, or other files excluded by `.gitignore`. Avoid adding identifying or restricted participant information to tracked files.

## Current status and planned work

This repository is an **early-stage research project**. The current focus is establishing a reproducible Python environment and a documented acquisition workflow for OASIS-1 raw MRI data. Subsequent work may include validating downloaded files, documenting the data dictionary and MRI file formats, developing preprocessing procedures, conducting exploratory analyses, and producing reproducible reports. These activities should be documented as they are implemented; they are not presented here as completed functionality.

## License and attribution

See [`LICENSE`](LICENSE) for the license governing the repository's own code and materials. **The repository license does not replace the OASIS dataset's separate data-use conditions.** Consult the [OASIS website](https://sites.wustl.edu/oasisbrains/) for the dataset's required acknowledgments and citations before publishing results.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the repository's contribution guidelines. When proposing changes to the data acquisition workflow, keep the command-line script and notebook consistent with the shared package implementation.
