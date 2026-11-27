// Architectural details interpreted from the university logistics guide, 2026.
// The outlines below are three fixed nameplates, set in Noto Sans SC (SIL OFL).
// No school photograph, logo or externally loaded font is used in the scene.
const plateMeshes = {"文化餐厅":[595,124,"VwBdZwBZYQBKXgBDVgA2TgArRAAgOQAXNAATLQAQIAAJEQADCgABBQAIAAAPCAARFgAWIwAcLwAjNQAoOwAtQAAyRQA4TABDUgBQJABcKQBQLABKMwA/OwA1RAAsTwAjVAAgYAAZbgAUfAAQdwAJcgACagAEXAAJTwAQSQAUPQAcOAAhLwArKwAxIwA9HABKFgBYAwBkegBkegBWAwBWMwB3QwB8SAByTABoOwBjOABs3AB47QB47QAb7QAW7gAT7wAS8wASAwESBQESBwEUCAEXCQEcCgEtEgEoGQElGAEXFgERFAELEAEGCwEEBAED8QAD6gAD5AAF4AAI3gAM3QAT3AAbCQFpGAFfDwFUAQFF8gA44QAs2gAozQAhyAAnwgAsyAAv1QA34QA/6wBH9ABQ/QBaBQFkswBXwwBnwwABswABwAB70AB2yQBnxQBgvABSsgBFqQA6pABCnwBKqABSrABYtABiuwBuXgE5nwE5nwEZXgEZXgEhkQEhkQExXgExegFXhQFRgAFMegFHcwFCZQE6WAE0RgEtQgEzPgE5TQE9VAFAYwFHagFKcAFOdQFTfgFRgwFNiQFKkAFHlwFEpwE/uAE7swE2sAEwpwEynwE0lgE3jgE7hwE/fwFDeQFIcwFNVAEBUwEHUAEMVAEOVQERVgEUVgE5ZQE5ZQEMXAEIWAEFVQEDawFobQFobwFodwFkdAFecAFZawFUZgFPYAFLUwFERgE/QwFEPwFISwFNUAFPWwFWYAFZZgFfawFmowF1pwF2sAFyrQFsqgFmpgFhogFcnQFYmAFUkwFRhwFMhAFRgAFWhwFZjwFdlQFhmwFnnwFtowFzfQFhhQFplQFioAFcrAFUsgFQqAFHowFLmAFThwFcdgEUfQEdigEZlwEUowEPrQEKpQEAnAEFkAELgwEQVAEBVAEKWgEOgAESfgEHXgEDfgF1pgF1pgFrfgFrXgEslQEslQEmXgEmTwFrWwFpVwFjUQFdSwFXRAFSQAFXPAFaQgFeSAFiTAFnWAF6ZAF6ZAFjWAFjUQFobgFobgFfSwFfpAEhrgEaowESmAELkAEQmwEYXQF1egF1egFsXQFscQE/fQFBgQE7hQE2eAEzdQE4TAFVUwFbWgFXYAFSWAFMUgFQ5gFz9QFz9QE69AEm8QEX7gEP6wEH5wEA4QEF2gEK3gEQ4QEX4wEe5AEl5QEt5gE7IQJOMQJOMQITMQINLwIJLQIGKQIEJAICHgICDgIBDAIJCQIRHgIQIAIRIQIS+wFVUQJVUQJG+wFG7QFzUwJzUwJl7QFl","AQAAABgADwAOAA0ADQAMAAsACwAKAAkACQAIAAcABwAGAAUABQAEAAMAAwACAAEAAQAYABcAEAAPAA0ADQALAAkACQAHAAUABQADAAEAAQAXABYAEQAQAA0ADQAJAAUABQABABYAEgARAA0ABQAWABUAEgANAAUABQAVABQAEwASAAUABQAUABMAGgAZADAAMAAvAC4ALQAsACsAKwAqACkAKQAoACcAJwAmACUAJAAjACIAGwAaADAAMAAuAC0ALQArACkAKQAnACUAJQAkACIAHAAbADAAMAAtACkAKQAlACIAHQAcADAAKQAiACEAHgAdADAAKQAhACAAHgAwACkAKQAgAB8AHwAeACkAMgAxADQANAAzADIANgA1ADoAOgA5ADgAOAA3ADYANgA6ADgAPAA7AFYAVgBVAFQAVABTAFIAUgBRAFAAUABPAE4ATgBNAEwASwBKAEkASABHAEYAPQA8AFYAVgBUAFIAUgBQAE4ATgBMAEsASwBJAEgASABGAEUAPgA9AFYAVgBSAE4ATgBLAEgASABFAEQAPwA+AFYATgBIAEQAQAA/AFYATgBEAEMAQABWAE4ATgBDAEIAQQBAAE4ATgBCAEEAWABXAGcAYQBgAF8AXwBeAF0AXQBcAFsAWwBaAFkAWQBYAGcAYgBhAF8AXwBdAFsAWwBZAGcAYwBiAF8AWwBnAGYAZABjAF8AWwBmAGUAZABfAFsAWwBlAGQAaQBoAGsAawBqAGkAegB5AIAAfgB9AHwAegCAAH8AfgB8AHsAewB6AH8AfwB+AHsAggCBAJAAjgCNAIwAiwCKAIkAiQCIAIcAhwCGAIUAhQCEAIMAgwCCAJAAjACLAIkAiQCHAIUAhQCDAJAAjgCMAIkAhQCQAI8AjgCJAIUAhQCPAI4AkgCRAKEAoACfAJ4AngCdAJwAnACbAJoAmgCZAJgAmACXAJYAkwCSAKEAoQCgAJ4AngCcAJoAmgCYAJYAlACTAKEAoQCeAJoAmgCWAJUAlQCUAKEAoQCaAJUAowCiAK0ArQCsAKsAqwCqAKkAqQCoAKcApQCkAKMAowCtAKsAqwCpAKcApgClAKMAowCrAKcApwCmAKMArwCuAMAAvgC9ALwAvAC7ALoAuQC4ALcAtwC2ALUAtACzALIAsgCxALAAsACvAMAAvAC6ALkAuQC3ALUAtQC0ALIAsgCwAMAAvgC8ALkAuQC1ALIAsgDAAL8AvgC5ALIAsgC/AL4AwgDBANMAzgDNAMwAzADLAMoAygDJAMgAyADHAMYAxgDFAMQAxADDAMIAwgDTANIAzwDOAMwAzADKAMgAyADGAMQAxADCANIA0ADPAMwAzADIAMQAxADSANEA0ADMAMQAxADRANAA3wDeAOcA5QDkAOMA4wDiAOEA4QDgAN8A3wDnAOYA5gDlAOMA4wDhAN8A3wDmAOMA6QDoAO0A7QDsAOsA6wDqAOkA6QDtAOsA7wDuAPEA8QDwAO8A8wDyAPUA9QD0APMA9wD2AAAB/gD9APwA/AD7APoA+QD4APcA9wAAAf8A/wD+APwA/AD6APkA+QD3AP8A/wD8APkAAgEBAQQBBAEDAQIBCgEJAQ4BDgENAQwBDAELAQoBCgEOAQwBEAEPARIBEgERARABFAETARgBGAEXARYBFQEUARgBGAEWARUBGgEZAR4BHgEdARwBHAEbARoBGgEeARwBIAEfAS4BKQEoAScBJwEmASUBJAEjASIBIgEhASABIAEuAS0BKgEpAScBJwElASQBJAEiASABIAEtASwBKwEqAScBJwEkASABIAEsASsBKwEnASABMAEvAT0BOwE6ATkBOQE4ATcBNwE2ATUBNQE0ATMBMwEyATEBMQEwAT0BOwE5ATcBNwE1ATMBMwExAT0BPAE7ATcBNwEzAT0BPQE8ATcBQwFCAUUBRQFEAUMB"],"仙境食府":[596,124,"KwBcOQBcOQAWcAAWcAAIKwAISAB4VwB4VwAPSAAPZgBddQBddQABZgABEABWHgBkHgABEAABHQB6KwB2KABuIQBfGgBREQBECAA5BABBAABJBwBSCwBXEgBiGABu0ABKDgFKDgEi0AAi3gAx3gAsAAEsAAEx3gBA3gA6AAE6AAFArQB5vAB5vAAhrQAhoABbxwBbxwBNoABNywBbFQFbFQFOywBOzgByEQFyEQFmzgBm5gB59AB79wB1+QBv6gBr8wAmAQEmAQESAQEQAQEPAgEOCQEOCgEOCwEPDAESDAEbEgEXGAEVFwEKFgEIFAEFEQEDDQEDAAEC+wAD+AAE9gAF9QAH9AAK8wAN2wAm6gAm6QAf5wAZ5QAT4gAO3gAK2AAG0QADyAAAxQAGwAAMyAANzgAQ0gAS1gAV2AAY2gAcngAfqgAjyAAuywAgowAQ+wBmCQFjAgFW9gBZ2ABj5ABm5gBg6ABa2wBX2gBdXQFXoAFXoAEmXQEmXQExkQExkQFLXQFLVAEBUgEITwEOUQEPUgEQUwETVAEWVAFXYwFXYwEMWwEIVwEFVAEDeAF8hgF1fgFsdAFjbwFfZAFXWAFRRgFJQgFPPQFVTgFcWwFiYgFnaQFsbwFxdAF2fwF1hAFwigFskQFnmAFjoAFfqAFcugFXtAFRsAFKpAFOmQFTjgFZhAFgeQFqcwFwcQEeewEniAEhlwEZpAESrwELpAEAmgEHjQEPfwEXXQFElwFElwE5XQE5VAEBUwENWgESgAEXgAEKXgEEWAECowEsrgEjnwEakAEShwEalgEjbwFefAFigAFbhAFVdgFRcwFX5QFu9AFu9AE98wEo8QEc7gEQ6wEH6AEA4QEE2gEI3gEP4AEW4gEe5AEu5QE+OAJcRwJcRwIRRwIMRgIIRAIFQQIDPAICNwIBKgIAKAIIJQIPNQIPNwIQOAIQ7QFuVAJuVAJg7QFgAgJBDwJOEAJOEAIBAgIBCgJeGQJaFwJUEQJICwI9AwIy+gEp+AEw9AE3+QE9/gFDAgJJBQJRCAJYFgJLVAJLVAI9FgI9FwIyJAI3KwIqMQIfJAIZHwIlEgJ4IQJ8JQJzKQJqGQJlFgJu","AQAAAAUABQAEAAMAAgABAAUABQADAAIABwAGAAkACQAIAAcACwAKAA0ADQAMAAsADwAOABEAEQAQAA8AIgAoACcAIgAkACMAJQAkACIAHwAiACcAKAAiACMAJQAiACEAIAAfACcAKQAoACMAJgAlACEAIAAnACoAKQAjACYAJgAhACAAIAAqACkAKQAmACAALAArAC4ALgAtACwANAAzADYANgA1ADQAOAA3ADoAOgA5ADgAQQBAAFgAVwBWAFUAVQBUAFMAUwBSAFEAUQBQAE8ATwBOAE0ATQBMAEsASwBKAEkAQgBBAFgAWABXAFUAVQBTAFEAUQBPAE0ATQBLAEkAQwBCAFgAWABVAFEAUQBNAEkARABDAFgAUQBJAEgARQBEAFgAUQBIAEcARgBFAFgAWABRAEcARwBGAFgAWgBZAGoAZQBkAGMAYwBiAGEAYQBgAF8AXwBeAF0AXABbAFoAWgBqAGkAZgBlAGMAYwBhAF8AXwBdAFwAXABaAGkAZwBmAGMAYwBfAFwAXABpAGgAaABnAGMAYwBcAGgAbABrAG8AbwBuAG0AbQBsAG8AcQBwAHMAcwByAHEAdQB0AHkAeQB4AHcAdgB1AHkAeQB3AHYAewB6AIEAfwB+AH0AewCBAIAAfwB9AHwAfAB7AIAAgAB/AHwAgwCCAI4AjgCNAIwAjACLAIoAigCJAIgAhQCEAIMAgwCOAIwAjACKAIgAhgCFAIMAgwCMAIgAhwCGAIMAgwCIAIcAkACPAJ4AmQCYAJcAlwCWAJUAlQCUAJMAkwCSAJEAkQCQAJ4AmgCZAJcAlwCVAJMAkwCRAJ4AmwCaAJcAkwCeAJ0AnACbAJcAkwCdAJwAnACXAJMAoACfAK4ArgCtAKwArACrAKoAqgCpAKgApwCmAKUAogChAKAAoACuAKwArACqAKgAqACnAKUAogCgAKwArACoAKUAowCiAKwArAClAKQApACjAKwAsACvALgAtgC1ALQAtACzALIAsgCxALAAsAC4ALcAtwC2ALQAtACyALAAsAC3ALQAugC5ALwAvAC7ALoAvgC9AMMAwgDBAMAAwAC/AL4AvgDDAMIAwgDAAL4AxQDEAMkAyQDIAMcAxwDGAMUAxQDJAMcAywDKAM8AzwDOAM0AzADLAM8AzwDNAMwA0QDQAN4A2gDZANgA2ADXANYA1gDVANQA1ADTANIA0gDRAN4A2wDaANgA2ADWANQA1ADSAN4A3ADbANgA1ADeAN0A3QDcANgA2ADUAN0A4ADfAO0A7QDsAOsA6wDqAOkA6QDoAOcA5gDlAOQA5ADjAOIA4QDgAO0A7QDrAOkA6QDnAOYA5gDkAOIA4gDhAO0A7QDpAOYA5gDiAO0A7wDuAPEA8QDwAO8A8wDyAPYA9gD1APQA9ADzAPYABgEFAQgBCAEHAQYBCgEJAQ4BDgENAQwBCwEKAQ4BDgEMAQsBEAEPARQBFAETARIBEQEQARQBFAESAREB"],"厚德餐厅":[595,123,"JABjbQBjbQA8JAA8MgBLMgBGXgBGXgBLMgBZMgBUXgBUXgBZDAB1GwB1GwBHGgA7GQAtFwAgFAASEgAMDQAABwAFAAAIBAAQBgAYCQAkCwAwDABFFQB1eQB1eQBnFQBnGgAiegAiegAXGgAXQgAnUAAnUAAPUAALTwAHTQAFSQADRQACPwACMgABMAAILQAOPwANQQAOQgAOIwA3YgA3YgAtIwAtYAA3ZAA3ZwA4cAAwXQAnVgAkSAAfQgAnTQArWAAwYAA1ywBeFAFeFAE8ywA8/gBT/gBGCAFGCAFT6wBT6wBG9ABG9ABT1wBT1wBG4ABG4ABTxQA2GQE2GQEpxQApsABCtwBJvgBHvgAAsAAAugBeyABZwQBNtgA8rgAxpgAooAAyngA2owA7rQBItgBWxgBxGAFxGAFlxgBl6AB7+AB69QBk8wBa5QBb5wBr1wAh5AAh5AAP5QAO5gAO9gAN+QAO+gAP+gAR+wAZAAEWBwEUBgEOBAEJAgEGAAEE/AAD+AAC5wAC4QAC3QAE2gAF2AAI1wAMuAB6xQB1wQBvtgBiqwBWpQBRogBXngBdowBhrQBrtQB2AQEgDAElFAEYGQEQGgEMDgEHDQEKCQETBAEcyQAk1QAg0AASzQALygAFvwAMwQAPxQAX5QAn8AAr+QAb7QAX6QAfXgE5nwE5nwEZXgEZXgEhkQEhkQExXgExegFXhQFRgAFMegFHcwFCZQE6WAE0RgEtQgEzPgE5TQE9VAFAYwFHagFKcAFOdQFTfgFRgwFNiQFKkAFHlwFEpwE/uAE7swE2sAEwpwEynwE0lgE3jgE7hwE/fwFDeQFIcwFNVAEBUwEHUAEMVAEOVQERVgEUVgE5ZQE5ZQEMXAEIWAEFVQEDawFobQFobwFodwFkdAFecAFZawFUZgFPYAFLUwFERgE/QwFEPwFISwFNUAFPWwFWYAFZZgFfawFmowF1pwF2sAFyrQFsqgFmpgFhogFcnQFYmAFUkwFRhwFMhAFRgAFWhwFZjwFdlQFhmwFnnwFtowFzfQFhhQFplQFioAFcrAFUsgFQqAFHowFLmAFThwFcdgEUfQEdigEZlwEUowEPrQEKpQEAnAEFkAELgwEQVAEBVAEKWgEOgAESfgEHXgEDfgF1pgF1pgFrfgFrXgEslQEslQEmXgEmTwFrWwFpVwFjUQFdSwFXRAFSQAFXPAFaQgFeSAFiTAFnWAF6ZAF6ZAFjWAFjUQFobgFobgFfSwFfpAEhrgEaowESmAELkAEQmwEYXQF1egF1egFsXQFscQE/fQFBgQE7hQE2eAEzdQE4TAFVUwFbWgFXYAFSWAFMUgFQ5gFz9QFz9QE69AEm8QEX7gEP6wEH5wEA4QEF2gEK3gEQ4QEX4wEe5AEl5QEt5gE7IQJOMQJOMQITMQINLwIJLQIGKQIEJAICHgICDgIBDAIJCQIRHgIQIAIRIQIS+wFVUQJVUQJG+wFG7QFzUwJzUwJl7QFl","AwAJAAgAAwAFAAQABgAFAAMAAAADAAgACQADAAQABgADAAIAAQAAAAgACgAJAAQABwAGAAIAAQAIAAsACgAEAAcABwACAAEAAQALAAoACgAHAAEADQAMABsAFwAWABUAFQAUABMAEwASABEAEQAQAA8ADwAOAA0ADQAbABoAGAAXABUAFQATABEAEQAPAA0ADQAaABkAGQAYABUAFQARAA0ADQAZABUAHQAcAB8AHwAeAB0AIQAgACMAIwAiACEANAAzADYANgA1ADQATABHAEYASABPAEUAQgBFAE8AUQBQAEsATQBMAEYASABFAEQAQgBPAE4AUQBLAEoASQBIAEQAQwBCAE4ASQBEAEMAQwBOAFEARgBJAEMAQwBRAEoATQBGAEMAQwBKAE0AUwBSAFUAVQBUAFMAVwBWAFoAWgBZAFgAWABXAFoAZwBmAGkAaQBoAGcAcQBwAIcAhwCGAIUAhACDAIIAggCBAIAAgAB/AH4AfgB9AHwAfAB7AHoAegB5AHgAdQB0AHMAcgBxAIcAhwCFAIQAhACCAIAAgAB+AHwAfAB6AHgAcwByAIcAhwCEAIAAgAB8AHgAdQBzAIcAgAB4AHcAdQCHAIAAgAB3AHYAdgB1AIAAiQCIAJIAkACPAI4AjgCNAIwAjACLAIoAigCJAJIAkQCQAI4AjgCMAIoAigCSAJEAkQCOAIoAlACTAJsAmQCYAJcAlwCWAJUAlQCUAJsAmgCZAJcAlwCVAJsAmwCaAJcAnQCcAKMAogChAKAAoACfAJ4AngCdAKMAowCiAKAAoACeAKMApQCkAKgAqACnAKYApgClAKgAqgCpALAArgCtAKwAqgCwAK8ArgCsAKsAqwCqAK8ArwCuAKsAsgCxAMAAvgC9ALwAuwC6ALkAuQC4ALcAtwC2ALUAtQC0ALMAswCyAMAAvAC7ALkAuQC3ALUAtQCzAMAAvgC8ALkAtQDAAL8AvgC5ALUAtQC/AL4AwgDBANEA0ADPAM4AzgDNAMwAzADLAMoAygDJAMgAyADHAMYAwwDCANEA0QDQAM4AzgDMAMoAygDIAMYAxADDANEA0QDOAMoAygDGAMUAxQDEANEA0QDKAMUA0wDSAN0A3QDcANsA2wDaANkA2QDYANcA1QDUANMA0wDdANsA2wDZANcA1gDVANMA0wDbANcA1wDWANMA3wDeAPAA7gDtAOwA7ADrAOoA6QDoAOcA5wDmAOUA5ADjAOIA4gDhAOAA4ADfAPAA7ADqAOkA6QDnAOUA5QDkAOIA4gDgAPAA7gDsAOkA6QDlAOIA4gDwAO8A7gDpAOIA4gDvAO4A8gDxAAMB/gD9APwA/AD7APoA+gD5APgA+AD3APYA9gD1APQA9ADzAPIA8gADAQIB/wD+APwA/AD6APgA+AD2APQA9ADyAAIBAAH/APwA/AD4APQA9AACAQEBAAH8APQA9AABAQABDwEOARcBFQEUARMBEwESAREBEQEQAQ8BDwEXARYBFgEVARMBEwERAQ8BDwEWARMBGQEYAR0BHQEcARsBGwEaARkBGQEdARsBHwEeASEBIQEgAR8BIwEiASUBJQEkASMBJwEmATABLgEtASwBLAErASoBKQEoAScBJwEwAS8BLwEuASwBLAEqASkBKQEnAS8BLwEsASkBMgExATQBNAEzATIBOgE5AT4BPgE9ATwBPAE7AToBOgE+ATwBQAE/AUIBQgFBAUABRAFDAUgBSAFHAUYBRQFEAUgBSAFGAUUBSgFJAU4BTgFNAUwBTAFLAUoBSgFOAUwBUAFPAV4BWQFYAVcBVwFWAVUBVAFTAVIBUgFRAVABUAFeAV0BWgFZAVcBVwFVAVQBVAFSAVABUAFdAVwBWwFaAVcBVwFUAVABUAFcAVsBWwFXAVABYAFfAW0BawFqAWkBaQFoAWcBZwFmAWUBZQFkAWMBYwFiAWEBYQFgAW0BawFpAWcBZwFlAWMBYwFhAW0BbAFrAWcBZwFjAW0BbQFsAWcBcwFyAXUBdQF0AXMB"]};

function nameplate(g,edge,name,mid,bottom,height,availableWidth,out,color,letterSpacing=0) {
  const [width,h,positions,indices] = plateMeshes[name];
  const xy = atob(positions), tri=atob(indices), placed=new Map();
  const scale=Math.min(height/h,(availableWidth-3*letterSpacing)/width);
  function vertex(index) {
    if (!placed.has(index)) {
      const i=index*3, x=xy.charCodeAt(i)+256*xy.charCodeAt(i+1), y=xy.charCodeAt(i+2);
      // The four glyphs of the Houde plate have breaks at x=145, 301, 462.
      const glyph=letterSpacing ? Number(x>145)+Number(x>301)+Number(x>462) : 0;
      const point=edge.point(mid+(width*.5-x)*scale+(1.5-glyph)*letterSpacing,bottom+y*scale,out);
      placed.set(index,g.vertex(point,color));
    }
    return placed.get(index);
  }
  for(let i=0;i<tri.length;i+=6){
    g.indices.push(...[i,i+2,i+4].map(j=>vertex(tri.charCodeAt(j)+256*tri.charCodeAt(j+1))));
  }
}

// Prefer an explicit ground point; otherwise use the documented approach vector.
// A target on the junction of two edges favours a segment wide enough to contain
// the doorway. Billboard dimensions and bay positions remain approximate.
export function selectDiningEntrance(edges,item) {
  const target=item.diningEntrance;
  const fallback=item.kind==='cultureDining'?[1,0]:item.kind==='xianjingDining'?[-.89,.45]:[1,-.55];
  const normal=item.entranceNormal||fallback, n=Math.hypot(...normal)||1;
  let best=null;
  for(const e of edges) {
    const alignment=(e.nx*normal[0]+e.nz*normal[1])/n;
    const a=e.point(0,0), dir=[-e.nz,e.nx];
    let mid=e.length/2, distance=0;
    if(Array.isArray(target)){
      mid=Math.max(0,Math.min(e.length,(target[0]-a[0])*dir[0]+(target[1]-a[2])*dir[1]));
      const p=e.point(mid,0);distance=Math.hypot(target[0]-p[0],target[1]-p[2]);
    }
    const score=Array.isArray(target)?-distance+alignment*2+Math.min(e.length,10)*.3:
      alignment*29+Math.min(20,e.length)*.39;
    if(!best || score>best.score) best={edge:e,score,mid:Math.max(e.length*.24,Math.min(e.length*.76,mid))};
  }
  return best;
}

function entranceSteps(g,e,mid,width,rise,run,count,t,rails) {
  const {cuboid,steel}=t, dy=rise/count, dz=run/count;
  for(let i=0;i<count;i++){
    const out=1+run-i*dz;
    cuboid(g,e,mid-width*.5,mid+width*.5,i*dy,(i+1)*dy,-.06,out,'#b9bcb9');
  }
  if(!rails) return;
  for(const side of [-1,1]){
    const x=mid+side*(width*.5-.12);
    const at=(k,y)=>e.point(x,dy+(rise-dy)*k+y,1+run*(1-k));
    for(let i=0;i<=4;i++){
      const k=i/4;
      steel(g,at(k,0),at(k,.84),.038,'#879899');
    }
    steel(g,at(0,.84),at(1,.84),.055,'#a8b7b6');
    // Xianjing's entrance photo shows closely spaced bars between the main posts.
    steel(g,at(0,.16),at(1,.16),.022,'#9eaaa8');
    for(let span=0;span<4;span++){
      for(let i=1;i<8;i++){
        const k=(span+i/8)/4;
        steel(g,at(k,.16),at(k,.84),.013,'#a4afad');
      }
    }
  }
}

function doorScreens(g,e,mid,width,bottom,top,out,t) {
  const {face,glazing}=t;
  face(g,e,mid-width/2,mid+width/2,bottom,top,out,'#3c4a4f');
  const step=width/4;
  for(let i=0;i<4;i++){
    const x=mid-width/2+i*step, head=bottom+(top-bottom)*.76;
    glazing(g,e,x+.045,x+step-.045,bottom+.045,head-.03,out+.025,i);
    glazing(g,e,x+.045,x+step-.045,head+.055,top-.055,out+.025,i+1);
  }
}

function cultureSide(g,e,baseTop,roofY,wallTop,floors,t) {
  const {face,cuboid,glazing}=t, L=e.length, stepY=(roofY-baseTop)/floors;
  const bays=Math.max(1,Math.round(L/5.2)), step=L/bays;
  face(g,e,0,L,baseTop,roofY,0,'#aa6656');
  for(let floor=0;floor<floors;floor++){
    for(let j=0;j<bays;j++) {
      const a=step*(j+.13),b=step*(j+.87),y=baseTop+floor*stepY;
      glazing(g,e,a,b,y+stepY*.19,y+stepY*.8,.035,floor+j);
      face(g,e,(a+b)*.5-.035,(a+b)*.5+.035,y+stepY*.19,y+stepY*.8,.045,'#a4aaa5');
    }
  }
  for(let j=0;j<bays;j+=2) {
    const x=j*step;
    cuboid(g,e,x,Math.min(L,x+.23),baseTop,wallTop-.03,-.02,.20,'#e4e2d8');
  }
}

// The front reads as two tall glazed tiers above the entrance stairs. The
// published three-storey count drives the side elevations. The shallow arc and
// depth of the colonnade are reconstructed from the university's entrance photo.
export function cultureFacade(g,e,item,entry,baseTop,roofY,wallTop,floors,t) {
  const {face,cuboid,glazing,makeEdge}=t;
  const focus=entry.edge.point(entry.mid,0), here=e.point(e.length/2,0);
  const alignment=e.nx*entry.edge.nx+e.nz*entry.edge.nz;
  const inFrontArc=e===entry.edge || (alignment>.42 && Math.hypot(here[0]-focus[0],here[2]-focus[2])<30);
  if(!inFrontArc){
    cultureSide(g,e,baseTop,roofY,wallTop,floors,t);return;
  }
  const L=e.length, bays=Math.max(1,2*Math.round((L/7.5-1)/2)+1), span=L/bays;
  const depth=entry.edge.length<16 ? .12 : Math.min(1.4,L*.036);
  const curved=(s)=>depth*(1-(2*s/L-1)**2)+.16;
  const segments=[];
  for(let j=0;j<bays;j++){
    const x=j*span, z=(j+1)*span;
    const a=e.point(x,0,curved(x)), b=e.point(z,0,curved(z));
    segments.push(makeEdge([a[0],a[2]],[b[0],b[2]]));
  }
  const jDoor=e===entry.edge ? Math.max(0,Math.min(bays-1,Math.floor(entry.mid/span))) : -1;
  const topBand=wallTop-Math.min(1.5,wallTop*.14), platform=Math.min(1.55,roofY*.13);
  const beam=platform+(topBand-platform)*.49;
  segments.forEach((panel,j)=>{
    const w=panel.length,p=panel.point,corner=.20;
    face(g,panel,0,w,baseTop,wallTop,0,'#a75e51');
    cuboid(g,panel,0,w,topBand,wallTop,-.10,.34,'#e5e3d9');
    if(j===0)cuboid(g,panel,0,corner*2,0,wallTop,0,.40,'#e5e3d9');
    cuboid(g,panel,w-corner*2,w,0,wallTop,0,.40,'#e5e3d9');
    for(let floor=0;floor<2;floor++){
      if(floor===0 && j===jDoor)continue;
      const y0=floor===0?platform+.25:beam+.40;
      const y1=floor===0?beam-.25:topBand-(topBand-beam)*.18;
      const n=Math.max(2,Math.round((w-1)/1.25)), dx=(w-.9)/n;
      for(let k=0;k<n;k++){
        const a=.45+k*dx,b=a+dx;
        glazing(g,panel,a+.025,b-.025,y0,y1,.045,k+floor+j);
        face(g,panel,a,b,y0+(y1-y0)*.38-.025,y0+(y1-y0)*.38+.025,.055,'#778689');
      }
    }
    if(j===jDoor){
      const mid=w/2, doorW=Math.min(8.2,Math.max(6.3,w*.86)), stepW=doorW*1.14;
      doorScreens(g,panel,mid,doorW,platform,beam-.15,.12,t);
      cuboid(g,panel,mid-doorW*.55,mid+doorW*.55,beam-.28,beam-.04,-.06,2.50,'#a52e41');
      entranceSteps(g,panel,mid,stepW,platform,3.7,9,t,false);
      nameplate(g,panel,'文化餐厅',mid,topBand+.16,Math.max(.35,(wallTop-topBand)*.65),doorW,.385,'#a03346');
    }
    // An extended coping joins the curved facade to the retained flat roof.
    g.quad(p(0,wallTop,.34),p(0,wallTop,-depth-.60),p(w,wallTop,-depth-.60),p(w,wallTop,.34),'#e0dfd5');
  });
}

export function xianjingFacade(g,e,item,entry,baseTop,roofY,wallTop,floors,t) {
  const {face,cuboid,glazing}=t,L=e.length;
  const first=baseTop+(roofY-baseTop)/floors;
  face(g,e,0,L,baseTop,first,0,'#926652');
  face(g,e,0,L,first,roofY,0,'#dedfd7');
  const bays=Math.max(1,Math.round(L/3.05)), step=L/bays;
  for(let j=0;j<bays;j++) {
    const x=(j+.5)*step, half=Math.min(step*.23,1.02);
    const top=roofY-.43;
    face(g,e,x-half-.09,x+half+.09,first+.08,top+.08,.02,'#697b80');
    for(let k=1;k<floors;k++){
      const lo=first+(top-first)*(k-1)/(floors-1),hi=first+(top-first)*k/(floors-1);
      glazing(g,e,x-half,x+half,lo+.13,hi-.09,.035,j+k);
      face(g,e,x-half,x+half,lo+(hi-lo)*.54-.03,lo+(hi-lo)*.54+.03,.05,'#64797d');
    }
    if(e!==entry.edge || Math.abs(x-entry.mid)>5.8) glazing(g,e,x-half,x+half,baseTop+.7,first-.42,.035,j);
  }
  if(e!==entry.edge || L<7)return;
  const width=Math.min(10.6,L*.75), mid=Math.max(width*.54,Math.min(L-width*.54,entry.mid));
  const w=width/2,landing=Math.min(1.75,first*.32);
  const cap=Math.max(first+.25,landing+2.65);
  doorScreens(g,e,mid,width*.44,landing,cap-.56,.06,t);
  for(const side of [-1,1]){
    const x=mid+side*width*.45;
    cuboid(g,e,x-.14,x+.14,landing,cap,-.06,1.32,'#67564d');
    face(g,e,x-.38,x+.38,landing+.21,cap-.68,1.34,'#817d6b');
  }
  cuboid(g,e,mid-w,mid+w,cap-.38,cap-.14,-.06,1.56,'#ad8473');
  cuboid(g,e,mid-w-.13,mid+w+.13,cap-.15,cap-.02,-.06,1.68,'#766058');
  cuboid(g,e,mid-w-.20,mid+w+.20,cap-.025,cap+.11,-.06,1.77,'#bd8f7b');
  nameplate(g,e,'仙境食府',mid,cap+.14,Math.min(1.13,width*.11),width*.89,1.48,'#ac3458');
  entranceSteps(g,e,mid,width*1.03,landing,5.45,12,t,true);
}

// Houde occupies one part of the ground floor of the experts' apartments.
export function houdeEntrance(g,e,entry,baseTop,podium,t) {
  if(e!==entry.edge || e.length<6)return;
  const {face,cuboid,glazing,steel,makeEdge}=t, L=e.length, width=Math.min(8.6,L*.83);
  const mid=Math.max(width*.52,Math.min(L-width*.52,entry.mid)), h=podium-.18;
  const w=width/2;
  // The campus guide shows two side openings flanking the round vestibule.
  cuboid(g,e,mid-w,mid+w,baseTop,podium,.08,.17,'#bebbb2');
  const enterW=width*.73, leaf=enterW/6, opening=baseTop+(h-baseTop)*.79;
  doorScreens(g,e,mid,enterW,baseTop,opening,.19,t);
  for(const sign of [-1,1]){
    const x=mid+sign*2*leaf;
    face(g,e,x-leaf*.66,x+leaf*.66,baseTop+.08,opening-.67,.24,'#656767');
    face(g,e,x-leaf*.59,x+leaf*.59,baseTop+.13,opening-.73,.25,'#ada49b');
    face(g,e,x-.032,x+.032,baseTop+.13,opening-.73,.26,'#626c69');
  }
  const soffit=h*.79;
  cuboid(g,e,mid-w,mid+w,soffit,h+.07,.045,.86,'#d0d0c8');
  // The entrance photo shows a stone strip under the sign above the round vestibule.
  cuboid(g,e,mid-.28,mid+.28,soffit-.065,soffit-.01,.045,.84,'#b7b4aa');
  for(let i=1;i<9;i++){
    const x=mid-w+i*width/9;
    face(g,e,x-.009,x+.009,h*.80,h+.06,.867,'#9b9d98');
  }
  nameplate(g,e,'厚德餐厅',mid-width*.10,h*.815,Math.max(.31,h*.16),width*.71,.90,'#ac3f58',width*.056);
  const r=Math.min(1.14,width*.16), p=e.point, high=h*.63;
  const axis=.27, divisions=12, center=p(mid,high,axis);
  steel(g,p(mid,high+.18,.35),p(mid,soffit-.035,.35),.17,'#b4ab9d');
  for(let i=0;i<divisions;i++){
    const a=i*Math.PI/divisions,b=(i+1)*Math.PI/divisions;
    const xa=mid-r*Math.cos(a), xb=mid-r*Math.cos(b), da=axis+r*Math.sin(a),db=axis+r*Math.sin(b);
    const aa=p(xa,high,da),bb=p(xb,high,db),panel=makeEdge([aa[0],aa[2]],[bb[0],bb[2]]);
    face(g,panel,0,panel.length,high,high+.20,0,'#779793');
    const ia=g.vertex(p(xa,high+.20,da),'#9eb4ad'),ic=g.vertex([center[0],high+.20,center[2]],'#9eb4ad');
    const ib=g.vertex(p(xb,high+.20,db),'#9eb4ad');
    g.indices.push(ia,ic,ib);
    if(i<3 || i>=divisions-3){
      glazing(g,panel,.012,panel.length-.012,baseTop+.09,high-.06,.01,i);
      face(g,panel,0,.025,baseTop+.07,high,.018,'#597c78');
    }
  }
  cuboid(g,e,mid-.045,mid+.045,baseTop,high,axis-.04,axis+.04,'#648281');
  for(const angle of [.20,Math.PI*.77]){
    const end=p(mid+r*.89*Math.cos(angle),baseTop,axis+r*.89*Math.sin(angle));
    const wing=makeEdge([center[0],center[2]],[end[0],end[2]]);
    glazing(g,wing,0,wing.length,baseTop+.10,high-.10,0,1);
    face(g,wing,0,wing.length,baseTop+.88,baseTop+.94,.015,'#8ba49d');
  }
  // Only repeat the wall-mounted units at the storeys visible in the entrance photo.
  const bays=Math.max(1,Math.round(L/5.7)), unitFloor=podium-baseTop;
  for(let i=0;i<bays;i++){
    const x=L*i/bays+.72;
    for(const level of (i===1?[0,1]:[0])){
      const y=podium+level*unitFloor+.15;
      cuboid(g,e,x-.42,x+.42,y-.08,y,.08,.58,'#a1a7a0');
      cuboid(g,e,x-.36,x+.36,y,y+.43,.12,.52,'#d0d4cd');
      const center=g.vertex(p(x-.08,y+.22,.53),'#727e7b');
      const rim=[];
      for(let n=0;n<10;n++){
        const a=2*Math.PI*n/10;
        rim.push(g.vertex(p(x-.08+Math.cos(a)*.148,y+.22+Math.sin(a)*.148,.53),'#899591'));
      }
      for(let n=0;n<rim.length;n++)g.indices.push(center,rim[(n+1)%rim.length],rim[n]);
    }
  }
}
